"""add appeal completed at

Revision ID: 0014_appeal_completed_at
Revises: 0013_appeal_storage
Create Date: 2026-05-15
"""

from alembic import op
import sqlalchemy as sa


revision = "0014_appeal_completed_at"
down_revision = "0013_appeal_storage"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("denials", sa.Column("appeal_completed_at", sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column("denials", "appeal_completed_at")
