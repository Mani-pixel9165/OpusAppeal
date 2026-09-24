"""create denial actions

Revision ID: 0011_denial_actions
Revises: 0010_denial_categories
Create Date: 2026-05-15
"""

from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa


revision = "0011_denial_actions"
down_revision = "0010_denial_categories"
branch_labels = None
depends_on = None


DEFAULT_ACTIONS = (
    "Claims Corrected in PM",
    "Routine Adjustments",
    "Writeoff",
    "Resolved via Phone",
    "Appealed Outside of Appealio",
    "Charge Entry Error",
    "Pending Information",
    "Other",
)


def upgrade():
    op.create_table(
        "denial_actions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(op.f("ix_denial_actions_is_active"), "denial_actions", ["is_active"], unique=False)
    op.create_index(op.f("ix_denial_actions_name"), "denial_actions", ["name"], unique=False)

    op.add_column("denials", sa.Column("assigned_action_id", sa.Integer(), nullable=True))
    op.add_column("denials", sa.Column("action_other_description", sa.Text(), nullable=True))
    op.add_column("denials", sa.Column("action_notes", sa.Text(), nullable=True))
    op.add_column("denials", sa.Column("action_assigned_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("denials", sa.Column("action_completed_at", sa.DateTime(timezone=True), nullable=True))
    op.create_foreign_key("fk_denials_assigned_action_id", "denials", "denial_actions", ["assigned_action_id"], ["id"])
    op.create_index(op.f("ix_denials_assigned_action_id"), "denials", ["assigned_action_id"], unique=False)

    denial_actions = sa.table(
        "denial_actions",
        sa.column("name", sa.String),
        sa.column("is_active", sa.Boolean),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    now = datetime.now(timezone.utc)
    op.bulk_insert(
        denial_actions,
        [
            {"name": name, "is_active": True, "created_at": now, "updated_at": now}
            for name in DEFAULT_ACTIONS
        ],
    )


def downgrade():
    op.drop_index(op.f("ix_denials_assigned_action_id"), table_name="denials")
    op.drop_constraint("fk_denials_assigned_action_id", "denials", type_="foreignkey")
    op.drop_column("denials", "action_completed_at")
    op.drop_column("denials", "action_assigned_at")
    op.drop_column("denials", "action_notes")
    op.drop_column("denials", "action_other_description")
    op.drop_column("denials", "assigned_action_id")
    op.drop_index(op.f("ix_denial_actions_name"), table_name="denial_actions")
    op.drop_index(op.f("ix_denial_actions_is_active"), table_name="denial_actions")
    op.drop_table("denial_actions")
