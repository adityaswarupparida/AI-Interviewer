# AI Interviewer

An AI-powered voice interview platform. A recruiter creates an interview, sends the candidate an invite link, and a Gemini-powered voice agent conducts the full interview in real-time — then automatically evaluates the transcript and generates a structured report.

---

## How it works

```
Recruiter creates interview
        ↓
Backend extracts skills from JD (Gemini), creates LiveKit room
        ↓
Candidate opens invite link → joins room via browser
        ↓
LiveKit dispatches job → Agent worker connects
        ↓
Gemini Live API conducts voice interview (real-time, bidirectional audio)
        ↓
Agent detects [INTERVIEW_COMPLETE] or candidate disconnect
        ↓
Transcript POSTed to backend webhook → Celery queues evaluation
        ↓
Gemini evaluates transcript → structured report saved to DB
        ↓
Recruiter views report on dashboard
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Real-time UI | LiveKit Components React, Recharts |
| Backend API | FastAPI, Uvicorn, SQLAlchemy, Alembic |
| Database | PostgreSQL 16 |
| Task Queue | Celery + Redis |
| Voice Agent | LiveKit Agents 1.4.3 |
| AI Model | Gemini 2.5 Flash (Live API for voice, standard API for evaluation) |
| Observability | Langfuse (optional) |
| Infrastructure | Docker Compose |

---

## Project Structure

```
ai-intrvwr/
├── backend/
│   ├── agents/
│   │   ├── interviewer_agent.py   # LiveKit voice agent (Gemini Live API)
│   │   └── evaluator_agent.py     # Transcript evaluation + report generation
│   ├── api/
│   │   ├── interviews.py          # Create interview, issue candidate token
│   │   ├── reports.py             # Fetch evaluation report
│   │   ├── webhooks.py            # Receive transcript from agent
│   │   └── metrics.py             # Frontend latency metrics
│   ├── db/
│   │   ├── models.py              # SQLAlchemy models
│   │   ├── schemas.py             # Pydantic schemas
│   │   └── database.py            # DB session
│   ├── tasks/
│   │   └── evaluate.py            # Celery evaluation task
│   ├── services/
│   │   └── livekit_service.py     # Room creation, token generation
│   ├── config.py                  # Settings (pydantic-settings)
│   ├── observability.py           # Langfuse lazy singleton
│   ├── celery_app.py              # Celery app
│   └── main.py                    # FastAPI app
├── frontend/
│   ├── app/
│   │   ├── page.tsx               # Recruiter dashboard
│   │   ├── interview/[id]/        # Candidate interview room
│   │   └── report/[id]/           # Evaluation report
│   └── components/
│       ├── InterviewRoom.tsx      # LiveKit voice UI
│       └── ReportCard.tsx         # Report visualisation
└── docker-compose.yml
```

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- [LiveKit Cloud](https://cloud.livekit.io) account (free tier works) — for `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- [Google AI API key](https://aistudio.google.com/apikey) with Gemini 2.5 Flash access — for `GEMINI_API_KEY`

---

## Setup

**1. Clone the repo**

```bash
git clone <repo-url>
cd ai-intrvwr
```

**2. Create your `.env` file**

```bash
cp .env.example .env
```

Fill in the required values (see [Environment Variables](#environment-variables) below).

**3. Start all services**

```bash
docker compose up --build
```

This starts Postgres, Redis, the FastAPI backend (with Alembic migrations), the Celery worker, the LiveKit agent worker, and the Next.js frontend.

**4. Open the app**

```
http://localhost:3000
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Required
GEMINI_API_KEY=your_google_ai_api_key

LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

# Database (default works with docker compose)
DATABASE_URL=postgresql+psycopg2://postgres:postgres@postgres:5432/ai_intrvwr
REDIS_URL=redis://redis:6379/0

# URLs
BACKEND_URL=http://backend:8000    # used by agent to call webhook
FRONTEND_URL=http://localhost:3000 # used to generate invite links

# Observability (optional — leave blank to disable)
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=https://cloud.langfuse.com
```

---

## Services

| Service | Port | Description |
|---------|------|-------------|
| `frontend` | 3000 | Next.js recruiter dashboard |
| `backend` | 8000 | FastAPI REST API |
| `agent` | — | LiveKit agent worker (connects outbound to LiveKit) |
| `celery` | — | Async evaluation worker |
| `postgres` | 5432 | PostgreSQL database |
| `redis` | 6379 | Celery broker + result backend |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/interviews` | Create interview, returns invite link |
| `GET` | `/api/interviews` | List all interviews |
| `GET` | `/api/interviews/{id}/token` | Get LiveKit token for candidate |
| `GET` | `/api/reports/{id}` | Fetch evaluation report (202 while pending) |
| `POST` | `/api/webhooks/interview-complete` | Called by agent with transcript |
| `POST` | `/api/metrics/latency` | Frontend latency telemetry |
| `GET` | `/health` | Health check |

---

## Interview Flow (Detailed)

1. **Recruiter** fills out candidate name, email, role, and job description on the dashboard.
2. **Backend** uses Gemini to extract skills to assess from the JD, then creates a LiveKit room with metadata (candidate name, role, JD, skills) attached.
3. **Recruiter** copies the invite link and sends it to the candidate.
4. **Candidate** opens the link in a browser — the frontend fetches a LiveKit token and connects to the room with audio enabled.
5. **LiveKit** detects a participant joined the room and dispatches a job to the agent worker.
6. **Agent** (`interviewer_agent.py`) connects to the room, starts an `AgentSession` with `google.realtime.RealtimeModel` (Gemini 2.5 Flash Native Audio), and immediately greets the candidate.
7. **Gemini Live API** conducts the interview — listens, thinks, and speaks in real-time with native audio turn detection.
8. When all skills are covered, the agent ends with `[INTERVIEW_COMPLETE]`. If the candidate disconnects early, the agent finalises with whatever transcript exists.
9. **Transcript** is POSTed to `/api/webhooks/interview-complete`.
10. **Celery** picks up the evaluation task — Gemini scores the transcript across competencies, skills, strengths, weaknesses, flags, and improvement areas — and saves the report to Postgres.
11. **Frontend** polls `/api/reports/{id}` every 5 seconds and displays the report when ready.

---

## Observability (Langfuse)

When `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` are set, the platform automatically traces:

- Per-interview session with candidate metadata
- Per-turn user events and agent generations
- Turn latency scores from the frontend
- Evaluation generations with model, input, output, and duration
- Overall interview scores

Leave the keys blank to run without observability.

---

## Development Notes

- **Code changes** are picked up immediately via Docker volume mounts — no rebuild needed for Python or TypeScript changes.
- **Dependency changes** (`requirements.txt` or `package.json`) require a rebuild: `docker compose up --build`.
- **Database migrations** run automatically on backend startup via `alembic upgrade head`.
- **Agent logs** are the best place to debug interview issues: `docker compose logs -f agent`.
- Do **not** add `noise_cancellation=True` to `RoomInputOptions` — Silero runs on CPU and blocks the audio pipeline, causing Gemini WebSocket timeouts.
- Do **not** add a separate `vad=` to `AgentSession` — Gemini Live API handles turn detection natively.
