"""create assignment rules

Revision ID: 0005_create_assignment_rules
Revises: 0004_expand_denial_text_fields
Create Date: 2026-05-09
"""

from alembic import op
import sqlalchemy as sa


revision = "0005_create_assignment_rules"
down_revision = "0004_expand_denial_text_fields"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "assignment_rules",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("assigned_to_id", sa.Integer(), nullable=False),
        sa.Column("created_by_id", sa.Integer(), nullable=False),
        sa.Column("criteria", sa.JSON(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("effective_from", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deactivated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["assigned_to_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_assignment_rules_assigned_to_id"), "assignment_rules", ["assigned_to_id"], unique=False)
    op.create_index(op.f("ix_assignment_rules_is_active"), "assignment_rules", ["is_active"], unique=False)
    op.create_index(op.f("ix_assignment_rules_organization_id"), "assignment_rules", ["organization_id"], unique=False)


def downgrade():
    op.drop_index(op.f("ix_assignment_rules_organization_id"), table_name="assignment_rules")
    op.drop_index(op.f("ix_assignment_rules_is_active"), table_name="assignment_rules")
    op.drop_index(op.f("ix_assignment_rules_assigned_to_id"), table_name="assignment_rules")
    op.drop_table("assignment_rules")
