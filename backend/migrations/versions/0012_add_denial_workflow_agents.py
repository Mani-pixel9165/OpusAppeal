"""add denial workflow agents

Revision ID: 0012_denial_workflow_agents
Revises: 0011_denial_actions
Create Date: 2026-05-15
"""

from alembic import op
import sqlalchemy as sa


revision = "0012_denial_workflow_agents"
down_revision = "0011_denial_actions"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("denials", sa.Column("appeal_started_by_id", sa.Integer(), nullable=True))
    op.add_column("denials", sa.Column("appeal_completed_by_id", sa.Integer(), nullable=True))
    op.add_column("denials", sa.Column("action_assigned_by_id", sa.Integer(), nullable=True))
    op.add_column("denials", sa.Column("action_completed_by_id", sa.Integer(), nullable=True))

    op.create_foreign_key("fk_denials_appeal_started_by_id", "denials", "users", ["appeal_started_by_id"], ["id"])
    op.create_foreign_key("fk_denials_appeal_completed_by_id", "denials", "users", ["appeal_completed_by_id"], ["id"])
    op.create_foreign_key("fk_denials_action_assigned_by_id", "denials", "users", ["action_assigned_by_id"], ["id"])
    op.create_foreign_key("fk_denials_action_completed_by_id", "denials", "users", ["action_completed_by_id"], ["id"])

    op.create_index(op.f("ix_denials_appeal_started_by_id"), "denials", ["appeal_started_by_id"], unique=False)
    op.create_index(op.f("ix_denials_appeal_completed_by_id"), "denials", ["appeal_completed_by_id"], unique=False)
    op.create_index(op.f("ix_denials_action_assigned_by_id"), "denials", ["action_assigned_by_id"], unique=False)
    op.create_index(op.f("ix_denials_action_completed_by_id"), "denials", ["action_completed_by_id"], unique=False)


def downgrade():
    op.drop_index(op.f("ix_denials_action_completed_by_id"), table_name="denials")
    op.drop_index(op.f("ix_denials_action_assigned_by_id"), table_name="denials")
    op.drop_index(op.f("ix_denials_appeal_completed_by_id"), table_name="denials")
    op.drop_index(op.f("ix_denials_appeal_started_by_id"), table_name="denials")

    op.drop_constraint("fk_denials_action_completed_by_id", "denials", type_="foreignkey")
    op.drop_constraint("fk_denials_action_assigned_by_id", "denials", type_="foreignkey")
    op.drop_constraint("fk_denials_appeal_completed_by_id", "denials", type_="foreignkey")
    op.drop_constraint("fk_denials_appeal_started_by_id", "denials", type_="foreignkey")

    op.drop_column("denials", "action_completed_by_id")
    op.drop_column("denials", "action_assigned_by_id")
    op.drop_column("denials", "appeal_completed_by_id")
    op.drop_column("denials", "appeal_started_by_id")
