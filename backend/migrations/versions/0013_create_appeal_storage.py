"""create appeal storage

Revision ID: 0013_appeal_storage
Revises: 0012_denial_workflow_agents
Create Date: 2026-05-15
"""

from alembic import op
import sqlalchemy as sa


revision = "0013_appeal_storage"
down_revision = "0012_denial_workflow_agents"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "appeal_letter_templates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "name", name="uq_appeal_letter_templates_org_name"),
    )
    op.create_index(op.f("ix_appeal_letter_templates_created_by_id"), "appeal_letter_templates", ["created_by_id"], unique=False)
    op.create_index(op.f("ix_appeal_letter_templates_name"), "appeal_letter_templates", ["name"], unique=False)
    op.create_index(op.f("ix_appeal_letter_templates_organization_id"), "appeal_letter_templates", ["organization_id"], unique=False)

    op.create_table(
        "appeal_packages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("denial_id", sa.Integer(), nullable=False),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("form_data", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["denial_id"], ["denials.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("denial_id", name="uq_appeal_packages_denial_id"),
    )
    op.create_index(op.f("ix_appeal_packages_created_by_id"), "appeal_packages", ["created_by_id"], unique=False)
    op.create_index(op.f("ix_appeal_packages_denial_id"), "appeal_packages", ["denial_id"], unique=False)
    op.create_index(op.f("ix_appeal_packages_organization_id"), "appeal_packages", ["organization_id"], unique=False)

    op.create_table(
        "appeal_package_letters",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("package_id", sa.Integer(), nullable=False),
        sa.Column("template_id", sa.Integer(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("template_name", sa.String(length=255), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("pdf_html", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["package_id"], ["appeal_packages.id"]),
        sa.ForeignKeyConstraint(["template_id"], ["appeal_letter_templates.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_appeal_package_letters_package_id"), "appeal_package_letters", ["package_id"], unique=False)
    op.create_index(op.f("ix_appeal_package_letters_template_id"), "appeal_package_letters", ["template_id"], unique=False)

    op.create_table(
        "appeal_package_documents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("package_id", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("document_type", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("stored_filename", sa.String(length=255), nullable=False),
        sa.Column("file_path", sa.Text(), nullable=False),
        sa.Column("content_type", sa.String(length=160), nullable=True),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["package_id"], ["appeal_packages.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_appeal_package_documents_package_id"), "appeal_package_documents", ["package_id"], unique=False)


def downgrade():
    op.drop_index(op.f("ix_appeal_package_documents_package_id"), table_name="appeal_package_documents")
    op.drop_table("appeal_package_documents")
    op.drop_index(op.f("ix_appeal_package_letters_template_id"), table_name="appeal_package_letters")
    op.drop_index(op.f("ix_appeal_package_letters_package_id"), table_name="appeal_package_letters")
    op.drop_table("appeal_package_letters")
    op.drop_index(op.f("ix_appeal_packages_organization_id"), table_name="appeal_packages")
    op.drop_index(op.f("ix_appeal_packages_denial_id"), table_name="appeal_packages")
    op.drop_index(op.f("ix_appeal_packages_created_by_id"), table_name="appeal_packages")
    op.drop_table("appeal_packages")
    op.drop_index(op.f("ix_appeal_letter_templates_organization_id"), table_name="appeal_letter_templates")
    op.drop_index(op.f("ix_appeal_letter_templates_name"), table_name="appeal_letter_templates")
    op.drop_index(op.f("ix_appeal_letter_templates_created_by_id"), table_name="appeal_letter_templates")
    op.drop_table("appeal_letter_templates")
