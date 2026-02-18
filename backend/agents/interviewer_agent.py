"""
LiveKit voice agent — the real-time interviewer.

Run as a separate process:
    python -m backend.agents.interviewer_agent dev

The agent connects to LiveKit, waits for interview rooms, conducts the
interview via voice, then POSTs the transcript to the backend API which
queues the Celery evaluation task.
"""
import asyncio
import json
import logging

import httpx
from livekit.agents import Agent, AgentSession, JobContext, RoomInputOptions, WorkerOptions, cli
from livekit.plugins import google, silero

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
- Greet the candidate warmly when they join. Introduce yourself as their AI interviewer.
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

    async def on_enter(self) -> None:
        """Called once when the agent joins the room."""
        await self.session.say(
            "Hello! Welcome to your interview. I'm your AI interviewer today. "
            "Please take a moment to get comfortable — whenever you're ready, we'll begin."
        )


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_transcript(session: AgentSession) -> str:
    lines = []
    for msg in session.history.items:
        role = "Interviewer" if msg.role == "assistant" else "Candidate"
        content = msg.content if isinstance(msg.content, str) else str(msg.content)
        lines.append(f"{role}: {content}")
    return "\n\n".join(lines)


async def _finalize_interview(interview_id: str, session: AgentSession) -> None:
    """Save transcript and trigger async evaluation via backend API."""
    transcript = _build_transcript(session)
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

    session = AgentSession(
        stt=google.STT(),
        llm=google.LLM(model="gemini-2.0-flash"),
        tts=google.TTS(voice="en-US-Chirp3-HD-Puck"),
        vad=silero.VAD.load(),
    )

    interview_done = False

    @session.on("agent_speech_committed")
    def on_speech_committed(msg) -> None:
        nonlocal interview_done
        content = msg.content if isinstance(msg.content, str) else str(msg.content)
        if not interview_done and "[INTERVIEW_COMPLETE]" in content:
            interview_done = True
            asyncio.create_task(_finalize_interview(interview_id, session))

    await session.start(
        room=ctx.room,
        agent=InterviewerAgent(instructions),
        room_input_options=RoomInputOptions(noise_cancellation=True),
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
