"""Add refresh_tokens table for JTI revocation

Revision ID: 005_add_refresh_tokens
Revises: 004_user_workout_plans
Create Date: 2026-04-20
"""
from alembic import op
import sqlalchemy as sa

revision = "005_add_refresh_tokens"
down_revision = "004_user_workout_plans"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "refresh_tokens",
        sa.Column("jti", sa.String(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id"),
            nullable=False,
            index=True,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("refresh_tokens")
