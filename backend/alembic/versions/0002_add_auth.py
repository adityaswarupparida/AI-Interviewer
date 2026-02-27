"""add users table and user_id on interviews

Revision ID: 0002
Revises: 0001
Create Date: 2026-02-27 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(254), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String, nullable=False),
        sa.Column("full_name", sa.String(200), nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.add_column(
        "interviews",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
    )
    op.create_index("ix_interviews_user_id", "interviews", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_interviews_user_id", table_name="interviews")
    op.drop_column("interviews", "user_id")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
