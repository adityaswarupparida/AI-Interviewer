from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr


# ── Interviews ────────────────────────────────────────────────────────────────

class CreateInterviewRequest(BaseModel):
    candidate_name: str
    candidate_email: EmailStr
    role: str
    job_description: str


class InterviewResponse(BaseModel):
    id: UUID
    candidate_name: str
    role: str
    status: str
    invite_link: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Reports ───────────────────────────────────────────────────────────────────

class ReportSummary(BaseModel):
    id: UUID
    interview_id: UUID
    candidate_name: str
    role: str
    overall_score: float
    role_eligibility: str
    generated_at: datetime


class ReportDetail(BaseModel):
    id: UUID
    interview_id: UUID
    candidate_name: str
    role_applied: str
    overall_score: float
    role_eligibility: str
    recommendation: str
    skill_scores: list[dict]
    competency_scores: dict
    strengths: list[str]
    weaknesses: list[str]
    areas_for_improvement: list[dict]
    red_flags: Optional[list[str]]
    green_flags: Optional[list[str]]
    interview_quality_notes: Optional[str]
    generated_at: datetime
