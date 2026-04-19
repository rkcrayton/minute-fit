"""Create user_workout_plans table

Revision ID: 004_user_workout_plans
Revises: 003_expand_exercises
Create Date: 2026-04-16
"""
from alembic import op
import sqlalchemy as sa

revision = "004_user_workout_plans"
down_revision = "003_expand_exercises"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_workout_plans",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id"),
            nullable=False,
            unique=True,
            index=True,
        ),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("subtitle", sa.String(), nullable=True),
        sa.Column("schedule", sa.JSON(), nullable=False),
        sa.Column("generation_prefs", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("user_workout_plans")
