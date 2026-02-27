# AI Interviewer — CLAUDE.md

## What this is
An AI-powered voice interview platform. A recruiter creates an interview; a Gemini-powered voice agent conducts it in real-time via LiveKit; Celery evaluates the transcript and saves a structured report to Postgres.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI, SQLAlchemy, Alembic |
| Voice Agent | LiveKit Agents 1.4.3 + Gemini 2.5 Flash Native Audio |
| Task Queue | Celery + Redis |
| Frontend | Next.js 15 (App Router), Tailwind, LiveKit React, Recharts |
| Database | PostgreSQL |
| Infra | Docker Compose |

Key files:
- `backend/agents/interviewer_agent.py` — LiveKit voice agent (Gemini Live API)
- `backend/tasks/evaluate.py` — Celery task that scores the transcript
- `backend/api/` — FastAPI routes (interviews, reports, webhooks, metrics)
- `frontend/components/InterviewRoom.tsx` — candidate-facing voice UI
- `frontend/components/ReportCard.tsx` — recruiter report view

---

## How to Run

```bash
cp .env.example .env   # fill in GEMINI_API_KEY, LIVEKIT_*
docker compose up
```

Code changes are picked up live via volume mounts — no rebuild needed.
Dependency changes (`requirements.txt`, `package.json`) require `docker compose up --build`.

For local dev without Docker:
```bash
# Backend deps
uv pip install -r backend/requirements.txt   # use uv, not pip

# Infra only
docker compose up postgres redis

# Then in separate terminals (all with PYTHONPATH=$(pwd)):
uvicorn backend.main:app --reload
celery -A backend.celery_app worker --loglevel=info
python -m backend.agents.interviewer_agent start   # use start, not dev
cd frontend && npm run dev
```

---

## Critical Constraints

**Agent (do not change these):**
- Do NOT set `noise_cancellation=True` in `RoomInputOptions` — Silero runs on CPU, blocks the audio pipeline, causes Gemini WebSocket keepalive timeouts.
- Do NOT add a separate `vad=` to `AgentSession` — Gemini Live API handles turn detection natively. Adding Silero VAD breaks it.
- Always use `python -m backend.agents.interviewer_agent start` in Docker — `dev` mode crashes in headless environments.

**Auth:**
- Do NOT use `passlib` — it's incompatible with `bcrypt >= 4.x` (raises `AttributeError: module 'bcrypt' has no attribute '__about__'` and `ValueError` during its internal `detect_wrap_bug` test). Use `bcrypt` directly instead: `bcrypt.hashpw(pw.encode(), bcrypt.gensalt())` / `bcrypt.checkpw(plain.encode(), hashed.encode())`.

**Dependencies:**
- `livekit-agents`, `livekit-plugins-google`, `livekit-plugins-silero` must stay pinned to the same version (currently `1.4.3`). They are a matched set.
- Use `gemini-2.5-flash` (or the native audio preview model). `gemini-2.0-flash` returns 404 for new API keys.
- Use `uv` instead of `pip` for backend package installs — it's what the Dockerfile uses.
