"""Add ai_insights column to scan_results

Revision ID: 001_add_ai_insights
Revises:
Create Date: 2026-03-23
"""
from alembic import op
import sqlalchemy as sa

revision = "001_add_ai_insights"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("scan_results", sa.Column("ai_insights", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("scan_results", "ai_insights")