"""add appeal status to denials

Revision ID: 0006_appeal_status
Revises: 0005_create_assignment_rules
Create Date: 2026-05-09
"""

from alembic import op
import sqlalchemy as sa


revision = "0006_appeal_status"
down_revision = "0005_create_assignment_rules"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("denials", sa.Column("appeal_status", sa.String(length=30), nullable=True))
    op.add_column("denials", sa.Column("appeal_stage", sa.Integer(), nullable=True))
    op.add_column("denials", sa.Column("appeal_started_at", sa.DateTime(timezone=True), nullable=True))
    op.execute("UPDATE denials SET appeal_status = 'pending' WHERE appeal_status IS NULL")
    op.execute("UPDATE denials SET appeal_stage = 1 WHERE appeal_stage IS NULL")
    op.alter_column("denials", "appeal_status", nullable=False)
    op.alter_column("denials", "appeal_stage", nullable=False)
    op.create_index(op.f("ix_denials_appeal_status"), "denials", ["appeal_status"], unique=False)


def downgrade():
    op.drop_index(op.f("ix_denials_appeal_status"), table_name="denials")
    op.drop_column("denials", "appeal_started_at")
    op.drop_column("denials", "appeal_stage")
    op.drop_column("denials", "appeal_status")
