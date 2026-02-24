# AI Interviewer — CLAUDE.md

## Project Stack
- **Backend**: FastAPI + LiveKit Agents + Gemini 2.5 Flash + Celery + PostgreSQL
- **Frontend**: Next.js 15 (App Router) + Tailwind + LiveKit React + Recharts
- **Infra**: Docker Compose + Redis (Celery broker) + uv (package manager)

---

## Mistakes Made & Lessons Learned

### 0. google.STT() / google.TTS() Require Google Cloud ADC — Not Gemini API Key
- `google.STT()` and `google.TTS()` from `livekit-plugins-google` use **Google Cloud Speech API**
- They require Application Default Credentials (service account JSON) — NOT a Gemini API key
- **For free route with just GEMINI_API_KEY**: use `beta.realtime.RealtimeModel` instead
  ```python
  from livekit.plugins.google import beta

  session = AgentSession(
      llm=beta.realtime.RealtimeModel(
          model="gemini-2.5-flash-native-audio-preview-12-2025",  # correct v1alpha model
          voice="Puck",
          api_key=settings.GEMINI_API_KEY,
      ),
      vad=silero.VAD.load(),
  )
  ```
- RealtimeModel handles STT + LLM + TTS natively in one model — no separate plugins needed
- Build transcript manually via `user_speech_committed` and `agent_speech_committed` session events
- **Correct Live API model name for `livekit-plugins-google 1.4.3`**: `gemini-2.5-flash-native-audio-preview-12-2025`
  - The plugin uses the `v1alpha` endpoint internally
  - `gemini-2.0-flash-exp` → 1008 policy violation (model removed)
  - `gemini-2.0-flash-live-001` → 1008 policy violation (uses `v1` not `v1alpha`)
  - The library error hint itself says: `"Use a Gemini API model (e.g., 'gemini-2.5-flash-native-audio-preview-12-2025')"`
- **`session.say()` does NOT work with RealtimeModel** — needs a separate TTS model. Handle greeting via instructions instead, tell the model to start by greeting the candidate
- **`RoomOptions` does NOT exist in livekit-agents 1.4.3** — keep using `RoomInputOptions`. The deprecation warning is a warning only, not an error. Do not change the import.

### 1. Gemini Model Name
- `gemini-2.0-flash` returns 404 NOT_FOUND for new users
- **Always use `gemini-2.5-flash`**

### 2. LiveKit Package Versions
- `livekit-agents`, `livekit-plugins-google`, `livekit-plugins-silero` must all be **pinned to the same version** — they are released as a matched set
- **Never pin `livekit` separately** — it is a transitive dependency managed by `livekit-agents`. Pinning it independently causes version conflicts
- Current working versions: `1.4.3` for all three

### 3. httpx Version Conflict
- `google-genai>=1.6` requires `httpx>=0.28.1`
- Do not pin `httpx==0.27.x` — use `httpx>=0.28.1`

### 4. pydantic[email] Required for EmailStr
- `EmailStr` requires the `email-validator` package
- Must install via `pydantic[email]` extra, not just `pydantic`
- Without it: `ImportError: email-validator is not installed`

### 5. Docker Volume Mount + PYTHONPATH
- Mounting `./backend:/app` puts backend files directly at `/app`
- Code imports `from backend.config import ...` so Python needs to see `backend/` as a subdirectory
- **Correct mount**: `./backend:/app/backend`
- **Required env**: `PYTHONPATH=/app` on all backend services
- Alembic must run from `/app/backend` (where `alembic.ini` lives):
  ```
  cd /app/backend && alembic upgrade head && cd /app && uvicorn backend.main:app
  ```

### 6. LiveKit Agent: `dev` vs `start` in Docker
- `dev` mode initializes `AgentsConsole` + `AudioProcessingModule` which requires a terminal and crashes in headless Docker
- **Always use `start` in Docker**: `python -m backend.agents.interviewer_agent start`
- `dev` is only for local development with a real terminal

### 7. livekit-rtc Missing System Library in Docker
- `python:3.12-slim` strips out system libraries
- `liblivekit_ffi.so` (used by `livekit-rtc`) requires `libgobject-2.0.so.0` (GLib)
- **Must install in Dockerfile**:
  ```dockerfile
  RUN apt-get update && apt-get install -y --no-install-recommends \
      libglib2.0-0 \
      && rm -rf /var/lib/apt/lists/*
  ```

### 8. Tailwind Not Rendering
- Tailwind requires `postcss.config.js` to process CSS directives
- **Must create** `frontend/postcss.config.js`:
  ```js
  module.exports = {
    plugins: { tailwindcss: {}, autoprefixer: {} }
  }
  ```
- Next.js dev server needs a **full restart** after adding this file — hot reload won't pick it up

### 9. Next.js NEXT_PUBLIC_ Env Vars
- `NEXT_PUBLIC_*` vars can be `undefined` in client components if not set at build/start time
- **Always add a fallback** in every file that uses them:
  ```ts
  const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000"
  ```
- Create `frontend/.env.local` with `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000` — Next.js gives this file highest priority

### 10. Docker Compose `version:` Key
- The `version:` top-level key is obsolete in Compose v2+
- Remove it to avoid the warning: `the attribute 'version' is obsolete`

### 11. Celery Running as Root Warning
- Celery warns when running as root (uid=0) inside Docker — this is a warning only, not an error
- To silence it set `C_FORCE_ROOT=1` env var in docker-compose (or add a non-root user for production)
- `broker_connection_retry_on_startup=True` is a separate setting (suppresses broker retry warnings at startup) — unrelated

### 12. Use uv Instead of pip
- `uv` is significantly faster than pip for installs
- Dockerfile: `COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv` then `uv pip install --system --no-cache -r requirements.txt`
- Local: `uv venv .venv && uv pip install -r backend/requirements.txt`

---

## Running the Project

### Docker (recommended)
```bash
cp .env.example .env   # fill in GEMINI_API_KEY, LIVEKIT_*
docker compose up
```

### Manually
```bash
# Infra only
docker compose up postgres redis

# Backend (Terminal 1)
source .venv/bin/activate && export PYTHONPATH=$(pwd)
cd backend && alembic upgrade head && cd ..
uvicorn backend.main:app --reload

# Celery (Terminal 2)
source .venv/bin/activate && export PYTHONPATH=$(pwd)
celery -A backend.celery_app worker --loglevel=info

# Agent (Terminal 3)
source .venv/bin/activate && export PYTHONPATH=$(pwd)
python -m backend.agents.interviewer_agent start

# Frontend (Terminal 4)
cd frontend && npm run dev
```

### URLs
| Service | URL |
|---|---|
| Recruiter Dashboard | http://localhost:3000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| Health Check | http://localhost:8000/health |
