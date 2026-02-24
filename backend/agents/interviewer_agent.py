"""
LiveKit voice agent — the real-time interviewer.

Uses Gemini Live API (RealtimeModel) which works with just a GEMINI_API_KEY.
google.STT() / google.TTS() require Google Cloud ADC (service account) — avoid them.

Run as a separate process:
    python -m backend.agents.interviewer_agent start
"""
import asyncio
import json
import logging

import httpx
from livekit.agents import Agent, AgentSession, JobContext, RoomInputOptions, WorkerOptions, cli
from livekit.plugins import silero
from livekit.plugins.google import beta

from backend.config import settings

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
    # No on_enter override — session.say() requires a separate TTS model which
    # RealtimeModel doesn't have. The greeting is handled by the instructions instead.


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
        logger.info("Interview %s finalized — evaluation queued.", interview_id)
    except Exception as exc:
        logger.error("Failed to finalize interview %s: %s", interview_id, exc)


# ── Entry point ───────────────────────────────────────────────────────────────

async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect()

    metadata = json.loads(ctx.room.metadata or "{}")
    interview_id = metadata.get("interview_id", "unknown")
    role = metadata.get("role", "Software Engineer")
    jd = metadata.get("job_description", "")
    skills = metadata.get("skills_to_cover", [])
    candidate_name = metadata.get("candidate_name", "the candidate")

    instructions = _INSTRUCTIONS.format(
        role=role,
        candidate_name=candidate_name,
        job_description=jd,
        skills_to_cover=", ".join(skills) if isinstance(skills, list) else skills,
    )

    # RealtimeModel uses Gemini Live API — works with GEMINI_API_KEY only.
    # Do NOT use google.STT() / google.TTS() — those require Google Cloud ADC.
    session = AgentSession(
        llm=beta.realtime.RealtimeModel(
            model="gemini-2.5-flash-native-audio-preview-12-2025",  # v1alpha model for livekit-plugins-google
            voice="Puck",
            api_key=settings.GEMINI_API_KEY,
        ),
        vad=silero.VAD.load(),
    )

    interview_done = False
    transcript_lines: list[str] = []

    @session.on("user_speech_committed")
    def on_user_speech(msg) -> None:
        content = msg.content if isinstance(msg.content, str) else str(msg.content)
        transcript_lines.append(f"Candidate: {content}")

    @session.on("agent_speech_committed")
    def on_agent_speech(msg) -> None:
        nonlocal interview_done
        content = msg.content if isinstance(msg.content, str) else str(msg.content)
        transcript_lines.append(f"Interviewer: {content}")

        if not interview_done and "[INTERVIEW_COMPLETE]" in content:
            interview_done = True
            transcript = "\n\n".join(transcript_lines)
            asyncio.create_task(_finalize_interview(interview_id, transcript))

    await session.start(
        room=ctx.room,
        agent=InterviewerAgent(instructions),
        room_input_options=RoomInputOptions(noise_cancellation=True),
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        agent_name="interviewer",   # must match CreateAgentDispatchRequest.agent_name
    ))
