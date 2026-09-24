"""create denials

Revision ID: 0002_create_denials
Revises: 0001_initial_schema
Create Date: 2026-05-08
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_create_denials"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "denials",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("patient", sa.String(length=255), nullable=False),
        sa.Column("claim_id", sa.String(length=120), nullable=False),
        sa.Column("service_date", sa.Date(), nullable=True),
        sa.Column("billed_amt", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("payment_amt", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("payer", sa.String(length=160), nullable=True),
        sa.Column("provider", sa.String(length=160), nullable=True),
        sa.Column("practice", sa.String(length=160), nullable=True),
        sa.Column("procedure", sa.String(length=80), nullable=True),
        sa.Column("modifier", sa.String(length=80), nullable=True),
        sa.Column("reason", sa.String(length=120), nullable=True),
        sa.Column("reason_desc", sa.Text(), nullable=True),
        sa.Column("remark", sa.String(length=120), nullable=True),
        sa.Column("remark_desc", sa.Text(), nullable=True),
        sa.Column("assigned_to_id", sa.Integer(), nullable=True),
        sa.Column("eob_date", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("date_added", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["assigned_to_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_denials_assigned_to_id"), "denials", ["assigned_to_id"], unique=False)
    op.create_index(op.f("ix_denials_claim_id"), "denials", ["claim_id"], unique=False)
    op.create_index(op.f("ix_denials_organization_id"), "denials", ["organization_id"], unique=False)


def downgrade():
    op.drop_index(op.f("ix_denials_organization_id"), table_name="denials")
    op.drop_index(op.f("ix_denials_claim_id"), table_name="denials")
    op.drop_index(op.f("ix_denials_assigned_to_id"), table_name="denials")
    op.drop_table("denials")

