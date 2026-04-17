"""Add profile_picture column to users

Revision ID: 002_add_profile_picture
Revises: 001_add_ai_insights
Create Date: 2026-04-15
"""
from alembic import op
import sqlalchemy as sa

revision = "002_add_profile_picture"
down_revision = "001_add_ai_insights"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("profile_picture", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "profile_picture")
