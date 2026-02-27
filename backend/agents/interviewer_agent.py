"""
LiveKit voice agent — the real-time interviewer.

Run as a separate process:
    python -m backend.agents.interviewer_agent start
"""
import asyncio
import json
import logging
import time

import httpx
from livekit.agents import Agent, AgentSession, JobContext, RoomInputOptions, WorkerOptions, cli
from livekit.plugins import google

from backend.config import settings
from backend.observability import get_langfuse

logger = logging.getLogger(__name__)

# ── Instructions ──────────────────────────────────────────────────────────────

_INSTRUCTIONS = """\
You are an expert technical interviewer for a {role} position.

CANDIDATE: {candidate_name}
SKILLS TO ASSESS: {skills_to_cover}

JOB CONTEXT:
{job_description}

YOUR BEHAVIOR:
- Start immediately by greeting the candidate warmly and introducing yourself as their AI interviewer. Do not wait for them to speak first.
- Ask ONE question at a time. Never stack multiple questions.
- Listen carefully and probe deeper when answers are vague or shallow.
- Progress naturally: warm-up → technical → behavioral → wrap-up.
- Be professional, encouraging, and patient.

QUESTION STRATEGY:
- Cover all skills listed above — aim for 8-12 questions total.
- For technical topics: start conceptual, then go practical/scenario-based.
- For behavioral: prompt with STAR format (Situation, Task, Action, Result).
- For senior roles: probe trade-offs, scale, and past architectural decisions.

ENDING THE INTERVIEW:
- When all skills are covered and at least 8 questions asked, wrap up naturally.
- Thank the candidate and explain that results will be shared soon.
- End your FINAL message with exactly: [INTERVIEW_COMPLETE]
  (This signals the system to save the transcript — do not use it mid-interview.)
"""


# ── Agent class ───────────────────────────────────────────────────────────────

class InterviewerAgent(Agent):
    def __init__(self, instructions: str) -> None:
        super().__init__(instructions=instructions)


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _finalize_interview(interview_id: str, transcript: str) -> None:
    """Save transcript and trigger async evaluation via backend API."""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{settings.BACKEND_URL}/api/webhooks/interview-complete",
                json={"interview_id": interview_id, "transcript": transcript},
            )
            resp.raise_for_status()
        logger.info("[FINALIZE] Interview %s finalized — evaluation queued.", interview_id)
    except Exception as exc:
        logger.error("[FINALIZE] Failed to finalize interview %s: %s", interview_id, exc)


# ── Entry point ───────────────────────────────────────────────────────────────

async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect()

    metadata = json.loads(ctx.room.metadata or "{}")
    interview_id = metadata.get("interview_id", "unknown")
    role = metadata.get("role", "Software Engineer")
    jd = metadata.get("job_description", "")
    skills = metadata.get("skills_to_cover", [])
    candidate_name = metadata.get("candidate_name", "the candidate")
    logger.info("[AGENT] interview_id=%s candidate=%s role=%s", interview_id, candidate_name, role)

    # ── Langfuse trace ────────────────────────────────────────────────────────
    lf = get_langfuse()
    trace = None
    if lf:
        trace = lf.trace(
            name="interview",
            id=interview_id,
            session_id=interview_id,
            user_id=candidate_name,
            metadata={
                "role": role,
                "candidate_name": candidate_name,
                "skills": skills,
            },
            tags=["interview", role],
        )
        logger.info("[OBSERVABILITY] Langfuse trace created: %s", interview_id)

    instructions = _INSTRUCTIONS.format(
        role=role,
        candidate_name=candidate_name,
        job_description=jd,
        skills_to_cover=", ".join(skills) if isinstance(skills, list) else skills,
    )

    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            model="gemini-2.5-flash-native-audio-preview-12-2025",
            voice="Zephyr",
            temperature=0.8,
            api_key=settings.GEMINI_API_KEY,
        ),
    )

    interview_done = False
    transcript_lines: list[str] = []
    last_user_speech_time: list[float] = [0.0]
    turn_index: list[int] = [0]

    @session.on("conversation_item_added")
    def on_conversation_item(event) -> None:
        nonlocal interview_done
        item = event.item
        text = item.text_content
        if not text:
            return

        item_role = str(item.role)
        now = time.monotonic()

        if "user" in item_role:
            label = "Candidate"
            last_user_speech_time[0] = now

            if trace:
                trace.event(
                    name="user_turn",
                    input=text,
                    metadata={"turn_index": turn_index[0]},
                )
        else:
            label = "Interviewer"
            latency_s = None
            if last_user_speech_time[0]:
                latency_s = now - last_user_speech_time[0]

            if trace:
                trace.generation(
                    name="agent_turn",
                    model="gemini-2.5-flash-native-audio-preview-12-2025",
                    output=text,
                    metadata={
                        "turn_index": turn_index[0],
                        "latency_s": round(latency_s, 3) if latency_s else None,
                    },
                )
            turn_index[0] += 1

        logger.info("[TRANSCRIPT] %s: %s", label, text[:80])
        transcript_lines.append(f"{label}: {text}")

        if label == "Interviewer" and not interview_done and "[INTERVIEW_COMPLETE]" in text:
            logger.info("[AGENT] [INTERVIEW_COMPLETE] detected — triggering finalization")
            interview_done = True
            transcript = "\n\n".join(transcript_lines)
            if trace:
                trace.update(
                    output=f"Interview completed — {turn_index[0]} turns",
                    metadata={"completion": "natural", "turns": turn_index[0]},
                )
            asyncio.create_task(_finalize_interview(interview_id, transcript))

    @ctx.room.on("participant_disconnected")
    def on_participant_disconnected(participant) -> None:
        nonlocal interview_done
        logger.info("[AGENT] participant_disconnected: %s | interview_done=%s | transcript_lines=%d",
                    participant.identity, interview_done, len(transcript_lines))
        if not interview_done and transcript_lines:
            interview_done = True
            transcript = "\n\n".join(transcript_lines)
            logger.info("[AGENT] finalizing interview %s with %d transcript lines", interview_id, len(transcript_lines))

            if trace:
                trace.update(
                    output=f"Interview ended by disconnect — {turn_index[0]} turns",
                    metadata={"completion": "disconnect", "turns": turn_index[0]},
                )

            async def _finalize_then_close() -> None:
                await _finalize_interview(interview_id, transcript)
                if lf:
                    lf.flush()
                await session.aclose()

            asyncio.create_task(_finalize_then_close())
        else:
            logger.info("[AGENT] no transcript to save (lines=%d, done=%s) — closing session", len(transcript_lines), interview_done)
            if lf:
                lf.flush()
            asyncio.create_task(session.aclose())

    await session.start(
        room=ctx.room,
        agent=InterviewerAgent(instructions),
        room_input_options=RoomInputOptions(close_on_disconnect=False),
    )

    # Give the candidate a moment to settle before the agent speaks first.
    await asyncio.sleep(2)
    await session.generate_reply()


if __name__ == "__main__":
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name="interviewer",   # must match CreateAgentDispatchRequest.agent_name
    ))
