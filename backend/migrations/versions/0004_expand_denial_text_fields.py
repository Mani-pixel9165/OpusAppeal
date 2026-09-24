"""expand denial text fields

Revision ID: 0004_expand_denial_text_fields
Revises: 0003_add_service_date_display
Create Date: 2026-05-08
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_expand_denial_text_fields"
down_revision = "0003_add_service_date_display"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column("denials", "patient", existing_type=sa.String(length=255), type_=sa.Text(), existing_nullable=False)
    op.alter_column("denials", "claim_id", existing_type=sa.String(length=120), type_=sa.String(length=500), existing_nullable=False)
    op.alter_column("denials", "service_date_display", existing_type=sa.String(length=500), type_=sa.Text(), existing_nullable=True)
    op.alter_column("denials", "payer", existing_type=sa.String(length=160), type_=sa.Text(), existing_nullable=True)
    op.alter_column("denials", "provider", existing_type=sa.String(length=160), type_=sa.Text(), existing_nullable=True)
    op.alter_column("denials", "practice", existing_type=sa.String(length=160), type_=sa.Text(), existing_nullable=True)
    op.alter_column("denials", "procedure", existing_type=sa.String(length=80), type_=sa.Text(), existing_nullable=True)
    op.alter_column("denials", "modifier", existing_type=sa.String(length=80), type_=sa.Text(), existing_nullable=True)
    op.alter_column("denials", "reason", existing_type=sa.String(length=120), type_=sa.Text(), existing_nullable=True)
    op.alter_column("denials", "remark", existing_type=sa.String(length=120), type_=sa.Text(), existing_nullable=True)


def downgrade():
    op.alter_column("denials", "remark", existing_type=sa.Text(), type_=sa.String(length=120), existing_nullable=True)
    op.alter_column("denials", "reason", existing_type=sa.Text(), type_=sa.String(length=120), existing_nullable=True)
    op.alter_column("denials", "modifier", existing_type=sa.Text(), type_=sa.String(length=80), existing_nullable=True)
    op.alter_column("denials", "procedure", existing_type=sa.Text(), type_=sa.String(length=80), existing_nullable=True)
    op.alter_column("denials", "practice", existing_type=sa.Text(), type_=sa.String(length=160), existing_nullable=True)
    op.alter_column("denials", "provider", existing_type=sa.Text(), type_=sa.String(length=160), existing_nullable=True)
    op.alter_column("denials", "payer", existing_type=sa.Text(), type_=sa.String(length=160), existing_nullable=True)
    op.alter_column("denials", "service_date_display", existing_type=sa.Text(), type_=sa.String(length=500), existing_nullable=True)
    op.alter_column("denials", "claim_id", existing_type=sa.String(length=500), type_=sa.String(length=120), existing_nullable=False)
    op.alter_column("denials", "patient", existing_type=sa.Text(), type_=sa.String(length=255), existing_nullable=False)
