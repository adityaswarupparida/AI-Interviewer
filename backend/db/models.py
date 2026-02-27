import uuid
from datetime import datetime

from sqlalchemy import Column, String, Float, JSON, DateTime, Text, ARRAY, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from backend.db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(254), unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    candidate_name = Column(String(200), nullable=False)
    candidate_email = Column(String(200), nullable=False)
    role = Column(String(200), nullable=False)
    job_description = Column(Text, nullable=False)
    skills_to_cover = Column(JSON, nullable=True)        # list[str] stored as JSON
    status = Column(String(50), default="pending")       # pending | active | completed | evaluated
    livekit_room_name = Column(String(200), nullable=True)
    transcript = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)


class Report(Base):
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    interview_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    overall_score = Column(Float, nullable=False)
    role_eligibility = Column(String(50), nullable=False)   # Strong Hire | Hire | No Hire | Strong No Hire
    recommendation = Column(Text, nullable=False)
    skill_scores = Column(JSON, nullable=False)             # list[{skill, score, evidence}]
    competency_scores = Column(JSON, nullable=False)        # {communication: {score, notes}, ...}
    strengths = Column(ARRAY(Text), nullable=False)
    weaknesses = Column(ARRAY(Text), nullable=False)
    areas_for_improvement = Column(JSON, nullable=False)    # list[{area, current_level, ...}]
    red_flags = Column(ARRAY(Text), nullable=True)
    green_flags = Column(ARRAY(Text), nullable=True)
    interview_quality_notes = Column(Text, nullable=True)
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
