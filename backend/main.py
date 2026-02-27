from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api import auth, interviews, reports, webhooks, metrics

app = FastAPI(title="AI Interviewer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(interviews.router)
app.include_router(reports.router)
app.include_router(webhooks.router)
app.include_router(metrics.router)


@app.get("/health")
def health():
    return {"status": "ok"}
