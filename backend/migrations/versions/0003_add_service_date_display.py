"""add service date display

Revision ID: 0003_add_service_date_display
Revises: 0002_create_denials
Create Date: 2026-05-08
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_add_service_date_display"
down_revision = "0002_create_denials"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("denials", sa.Column("service_date_display", sa.String(length=500), nullable=True))


def downgrade():
    op.drop_column("denials", "service_date_display")
