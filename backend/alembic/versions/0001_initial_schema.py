"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-01-01 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "interviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("candidate_name", sa.String(200), nullable=False),
        sa.Column("candidate_email", sa.String(200), nullable=False),
        sa.Column("role", sa.String(200), nullable=False),
        sa.Column("job_description", sa.Text, nullable=False),
        sa.Column("skills_to_cover", postgresql.JSON, nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("livekit_room_name", sa.String(200), nullable=True),
        sa.Column("transcript", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("started_at", sa.DateTime, nullable=True),
        sa.Column("ended_at", sa.DateTime, nullable=True),
    )

    op.create_table(
        "reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("interview_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("overall_score", sa.Float, nullable=False),
        sa.Column("role_eligibility", sa.String(50), nullable=False),
        sa.Column("recommendation", sa.Text, nullable=False),
        sa.Column("skill_scores", postgresql.JSON, nullable=False),
        sa.Column("competency_scores", postgresql.JSON, nullable=False),
        sa.Column("strengths", postgresql.ARRAY(sa.Text), nullable=False),
        sa.Column("weaknesses", postgresql.ARRAY(sa.Text), nullable=False),
        sa.Column("areas_for_improvement", postgresql.JSON, nullable=False),
        sa.Column("red_flags", postgresql.ARRAY(sa.Text), nullable=True),
        sa.Column("green_flags", postgresql.ARRAY(sa.Text), nullable=True),
        sa.Column("interview_quality_notes", sa.Text, nullable=True),
        sa.Column("generated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("reports")
    op.drop_table("interviews")
