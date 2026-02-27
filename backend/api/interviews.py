import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.agents.evaluator_agent import extract_skills_from_jd
from backend.auth import get_current_user
from backend.config import settings
from backend.db import models
from backend.db.database import get_db
from backend.db.schemas import CreateInterviewRequest, InterviewResponse
from backend.services.livekit_service import create_interview_room, generate_candidate_token

router = APIRouter(prefix="/api/interviews", tags=["interviews"])


@router.post("/", response_model=InterviewResponse, status_code=201)
async def create_interview(
    payload: CreateInterviewRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Recruiter creates an interview — returns an invite link to send the candidate."""
    skills = extract_skills_from_jd(payload.job_description, payload.role)

    interview_id = str(uuid.uuid4())
    room_name = f"interview-{interview_id}"

    await create_interview_room(
        room_name=room_name,
        interview_id=interview_id,
        role=payload.role,
        job_description=payload.job_description,
        skills_to_cover=skills,
        candidate_name=payload.candidate_name,
    )

    interview = models.Interview(
        id=uuid.UUID(interview_id),
        user_id=current_user.id,
        candidate_name=payload.candidate_name,
        candidate_email=payload.candidate_email,
        role=payload.role,
        job_description=payload.job_description,
        skills_to_cover=skills,
        livekit_room_name=room_name,
        status="pending",
    )
    db.add(interview)
    db.commit()

    return InterviewResponse(
        id=interview.id,
        candidate_name=interview.candidate_name,
        role=interview.role,
        status=interview.status,
        invite_link=f"{settings.FRONTEND_URL}/interview/{interview_id}",
        created_at=interview.created_at,
    )


@router.get("/{interview_id}/token")
def get_candidate_token(interview_id: str, db: Session = Depends(get_db)):
    """Candidate fetches their LiveKit token to join the interview room."""
    interview = (
        db.query(models.Interview)
        .filter(models.Interview.id == uuid.UUID(interview_id))
        .first()
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found.")
    if interview.status not in ("pending", "active"):
        raise HTTPException(status_code=400, detail=f"Interview is already '{interview.status}'.")

    token = generate_candidate_token(
        room_name=interview.livekit_room_name,
        participant_name=interview.candidate_name,
    )

    if interview.status == "pending":
        interview.status = "active"
        interview.started_at = datetime.now()
        db.commit()

    return {
        "token": token,
        "livekit_url": settings.LIVEKIT_URL,
        "room_name": interview.livekit_room_name,
        "candidate_name": interview.candidate_name,
        "role": interview.role,
    }


@router.get("/", response_model=list[InterviewResponse])
def list_interviews(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Dashboard — list all interviews for the current user, newest first."""
    interviews = (
        db.query(models.Interview)
        .filter(models.Interview.user_id == current_user.id)
        .order_by(models.Interview.created_at.desc())
        .all()
    )
    return [
        InterviewResponse(
            id=i.id,
            candidate_name=i.candidate_name,
            role=i.role,
            status=i.status,
            invite_link=f"{settings.FRONTEND_URL}/interview/{i.id}",
            created_at=i.created_at,
        )
        for i in interviews
    ]
