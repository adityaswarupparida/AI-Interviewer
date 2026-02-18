"""
Webhook endpoints:
  POST /api/webhooks/interview-complete  — called by the LiveKit agent
  POST /api/webhooks/livekit             — called by LiveKit Cloud (safety net)
"""
import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request

from backend.db.database import SessionLocal
from backend.db import models
from backend.tasks.evaluate import evaluate_interview

router = APIRouter(prefix="/api/webhooks", tags=["webhooks"])
logger = logging.getLogger(__name__)


@router.post("/interview-complete")
async def interview_complete(request: Request):
    """
    The LiveKit agent calls this endpoint when it detects [INTERVIEW_COMPLETE].
    Saves the transcript and queues the Celery evaluation task.
    """
    body = await request.json()
    interview_id: str = body.get("interview_id")
    transcript: str = body.get("transcript")

    if not interview_id or not transcript:
        raise HTTPException(status_code=400, detail="Missing interview_id or transcript.")

    db = SessionLocal()
    try:
        interview = (
            db.query(models.Interview)
            .filter(models.Interview.id == uuid.UUID(interview_id))
            .first()
        )
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found.")

        interview.transcript = transcript
        interview.status = "completed"
        interview.ended_at = datetime.utcnow()
        db.commit()

        # Queue async evaluation — non-blocking
        evaluate_interview.delay(interview_id)
        logger.info("Evaluation task queued for interview %s.", interview_id)

        return {"status": "ok", "message": "Transcript saved. Evaluation queued."}
    finally:
        db.close()


@router.post("/livekit")
async def livekit_webhook(request: Request):
    """
    LiveKit Cloud sends room lifecycle events here.
    Used as a safety net: if the agent crashes before calling /interview-complete,
    this will re-queue evaluation when the room closes (provided transcript was saved).
    """
    body = await request.json()
    event = body.get("event")

    if event == "room_finished":
        room_name = body.get("room", {}).get("name", "")
        if room_name.startswith("interview-"):
            interview_id = room_name.removeprefix("interview-")
            db = SessionLocal()
            try:
                interview = (
                    db.query(models.Interview)
                    .filter(models.Interview.id == uuid.UUID(interview_id))
                    .first()
                )
                if interview and interview.transcript and interview.status == "completed":
                    existing_report = (
                        db.query(models.Report)
                        .filter(models.Report.interview_id == uuid.UUID(interview_id))
                        .first()
                    )
                    if not existing_report:
                        evaluate_interview.delay(interview_id)
                        logger.info(
                            "Safety net: evaluation re-queued for interview %s.", interview_id
                        )
            finally:
                db.close()

    return {"status": "ok"}
