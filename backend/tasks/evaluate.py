"""
Celery task: evaluate_interview
Triggered after the interview ends. Fetches the transcript, runs the
Gemini evaluator, and saves the report to Postgres.
"""
import logging
import uuid
from datetime import datetime

from backend.celery_app import celery_app
from backend.agents.evaluator_agent import generate_report
from backend.db.database import SessionLocal
from backend.db import models

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,   # wait 60s before retry
    name="tasks.evaluate_interview",
)
def evaluate_interview(self, interview_id: str) -> str:
    """
    Args:
        interview_id: UUID string of the interview to evaluate.
    Returns:
        The UUID string of the generated report.
    """
    db = SessionLocal()
    try:
        interview = (
            db.query(models.Interview)
            .filter(models.Interview.id == uuid.UUID(interview_id))
            .first()
        )

        if not interview:
            logger.error("Interview %s not found — skipping evaluation.", interview_id)
            return

        if not interview.transcript:
            logger.error("Interview %s has no transcript — skipping.", interview_id)
            return

        # Guard against double-evaluation
        existing = (
            db.query(models.Report)
            .filter(models.Report.interview_id == uuid.UUID(interview_id))
            .first()
        )
        if existing:
            logger.warning("Report already exists for interview %s.", interview_id)
            return str(existing.id)

        logger.info("Starting evaluation for interview %s.", interview_id)

        report_data = generate_report(
            transcript=interview.transcript,
            role=interview.role,
            job_description=interview.job_description,
            candidate_name=interview.candidate_name,
            skills_to_cover=interview.skills_to_cover or [],
        )

        report = models.Report(
            interview_id=uuid.UUID(interview_id),
            overall_score=report_data["overall_score"],
            role_eligibility=report_data["role_eligibility"],
            recommendation=report_data["recommendation"],
            skill_scores=report_data["skill_scores"],
            competency_scores=report_data["competency_scores"],
            strengths=report_data["strengths"],
            weaknesses=report_data["weaknesses"],
            areas_for_improvement=report_data["areas_for_improvement"],
            red_flags=report_data.get("red_flags", []),
            green_flags=report_data.get("green_flags", []),
            interview_quality_notes=report_data.get("interview_quality_notes", ""),
            generated_at=datetime.utcnow(),
        )
        db.add(report)

        interview.status = "evaluated"
        db.commit()
        db.refresh(report)

        logger.info(
            "Evaluation complete for interview %s — report %s created.", interview_id, report.id
        )
        return str(report.id)

    except Exception as exc:
        db.rollback()
        logger.error("Evaluation failed for %s: %s", interview_id, exc)
        raise self.retry(exc=exc)
    finally:
        db.close()
