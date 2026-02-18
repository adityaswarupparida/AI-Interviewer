import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.db import models
from backend.db.database import get_db

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/{interview_id}")
def get_report(interview_id: str, db: Session = Depends(get_db)):
    """Fetch the full evaluation report for an interview."""
    interview = (
        db.query(models.Interview)
        .filter(models.Interview.id == uuid.UUID(interview_id))
        .first()
    )
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found.")

    report = (
        db.query(models.Report)
        .filter(models.Report.interview_id == uuid.UUID(interview_id))
        .first()
    )
    if not report:
        # 202 = request accepted but not ready yet
        raise HTTPException(status_code=202, detail="Report is still being generated.")

    return {
        "id": str(report.id),
        "interview_id": str(report.interview_id),
        "candidate_name": interview.candidate_name,
        "role_applied": interview.role,
        "overall_score": report.overall_score,
        "role_eligibility": report.role_eligibility,
        "recommendation": report.recommendation,
        "skill_scores": report.skill_scores,
        "competency_scores": report.competency_scores,
        "strengths": report.strengths,
        "weaknesses": report.weaknesses,
        "areas_for_improvement": report.areas_for_improvement,
        "red_flags": report.red_flags,
        "green_flags": report.green_flags,
        "interview_quality_notes": report.interview_quality_notes,
        "generated_at": report.generated_at,
    }


@router.get("/")
def list_reports(db: Session = Depends(get_db)):
    """List all generated reports with summary info."""
    reports = (
        db.query(models.Report)
        .order_by(models.Report.generated_at.desc())
        .all()
    )
    result = []
    for r in reports:
        interview = (
            db.query(models.Interview)
            .filter(models.Interview.id == r.interview_id)
            .first()
        )
        result.append({
            "id": str(r.id),
            "interview_id": str(r.interview_id),
            "candidate_name": interview.candidate_name if interview else "Unknown",
            "role": interview.role if interview else "Unknown",
            "overall_score": r.overall_score,
            "role_eligibility": r.role_eligibility,
            "generated_at": r.generated_at,
        })
    return result
