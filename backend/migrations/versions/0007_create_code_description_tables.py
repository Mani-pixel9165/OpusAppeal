"""create code description tables

Revision ID: 0007_code_descriptions
Revises: 0006_appeal_status
Create Date: 2026-05-10
"""

from alembic import op
import sqlalchemy as sa


revision = "0007_code_descriptions"
down_revision = "0006_appeal_status"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "code_descriptions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code_type", sa.String(length=20), nullable=False),
        sa.Column("code", sa.String(length=40), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("last_modified_at", sa.Date(), nullable=True),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code_type", "code", name="uq_code_descriptions_type_code"),
    )
    op.create_index(op.f("ix_code_descriptions_code"), "code_descriptions", ["code"], unique=False)
    op.create_index(op.f("ix_code_descriptions_code_type"), "code_descriptions", ["code_type"], unique=False)

    op.create_table(
        "code_description_extraction_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code_type", sa.String(length=20), nullable=False),
        sa.Column("run_label", sa.String(length=40), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("stopped_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("rows_seen", sa.Integer(), nullable=False),
        sa.Column("modified_updates", sa.Integer(), nullable=False),
        sa.Column("new_starts", sa.Integer(), nullable=False),
        sa.Column("rows_appended", sa.Integer(), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_code_description_extraction_logs_code_type"), "code_description_extraction_logs", ["code_type"], unique=False)
    op.create_index(op.f("ix_code_description_extraction_logs_status"), "code_description_extraction_logs", ["status"], unique=False)


def downgrade():
    op.drop_index(op.f("ix_code_description_extraction_logs_status"), table_name="code_description_extraction_logs")
    op.drop_index(op.f("ix_code_description_extraction_logs_code_type"), table_name="code_description_extraction_logs")
    op.drop_table("code_description_extraction_logs")
    op.drop_index(op.f("ix_code_descriptions_code_type"), table_name="code_descriptions")
    op.drop_index(op.f("ix_code_descriptions_code"), table_name="code_descriptions")
    op.drop_table("code_descriptions")
