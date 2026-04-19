"""Expand exercises with wger_id, equipment, category, description, image_url

Revision ID: 003_expand_exercises
Revises: 001_add_ai_insights
Create Date: 2026-04-16
"""
from alembic import op
import sqlalchemy as sa

revision = "003_expand_exercises"
down_revision = "001_add_ai_insights"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("exercises", sa.Column("wger_id", sa.Integer(), nullable=True))
    op.add_column("exercises", sa.Column("equipment", sa.String(), nullable=True))
    op.add_column("exercises", sa.Column("category", sa.String(), nullable=True))
    op.add_column("exercises", sa.Column("description", sa.Text(), nullable=True))
    op.add_column("exercises", sa.Column("image_url", sa.String(), nullable=True))
    op.create_index("ix_exercises_wger_id", "exercises", ["wger_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_exercises_wger_id", table_name="exercises")
    op.drop_column("exercises", "image_url")
    op.drop_column("exercises", "description")
    op.drop_column("exercises", "category")
    op.drop_column("exercises", "equipment")
    op.drop_column("exercises", "wger_id")
