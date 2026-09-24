"""create denial categories

Revision ID: 0010_denial_categories
Revises: 0009_add_user_name_fields
Create Date: 2026-05-14
"""

from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa


revision = "0010_denial_categories"
down_revision = "0009_add_user_name_fields"
branch_labels = None
depends_on = None


DENIAL_CATEGORIES = (
    ("197", "Authorization"),
    ("198", "Authorization"),
    ("210", "Authorization"),
    ("243", "Authorization"),
    ("284", "Authorization"),
    ("288", "Authorization"),
    ("39", "Authorization"),
    ("287", "Authorization"),
    ("296", "Authorization"),
    ("302", "Authorization"),
    ("29", "TFL"),
    ("286", "TFL"),
    ("97", "Bundling Errors"),
    ("236", "Bundling Errors"),
    ("231", "Bundling Errors"),
    ("114", "Bundling Errors"),
    ("26", "Eligibility/Non Coverage"),
    ("27", "Eligibility/Non Coverage"),
    ("31", "Eligibility/Non Coverage"),
    ("32", "Eligibility/Non Coverage"),
    ("33", "Eligibility/Non Coverage"),
    ("34", "Eligibility/Non Coverage"),
    ("35", "Eligibility/Non Coverage"),
    ("58", "Eligibility/Non Coverage"),
    ("96", "Eligibility/Non Coverage"),
    ("109", "Eligibility/Non Coverage"),
    ("119", "Eligibility/Non Coverage"),
    ("167", "Eligibility/Non Coverage"),
    ("183", "Eligibility/Non Coverage"),
    ("184", "Eligibility/Non Coverage"),
    ("185", "Eligibility/Non Coverage"),
    ("204", "Eligibility/Non Coverage"),
    ("272", "Eligibility/Non Coverage"),
    ("273", "Eligibility/Non Coverage"),
    ("18", "Duplicate"),
    ("B13", "Duplicate"),
    ("50", "Medical Necessity"),
    ("151", "Medical Necessity"),
    ("55", "Medical Necessity"),
    ("56", "Medical Necessity"),
)


def upgrade():
    op.create_table(
        "denial_categories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=40), nullable=False),
        sa.Column("category", sa.String(length=160), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index(op.f("ix_denial_categories_category"), "denial_categories", ["category"], unique=False)
    op.create_index(op.f("ix_denial_categories_code"), "denial_categories", ["code"], unique=False)

    denial_categories = sa.table(
        "denial_categories",
        sa.column("code", sa.String),
        sa.column("category", sa.String),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    now = datetime.now(timezone.utc)
    op.bulk_insert(
        denial_categories,
        [
            {"code": code, "category": category, "created_at": now, "updated_at": now}
            for code, category in DENIAL_CATEGORIES
        ],
    )


def downgrade():
    op.drop_index(op.f("ix_denial_categories_code"), table_name="denial_categories")
    op.drop_index(op.f("ix_denial_categories_category"), table_name="denial_categories")
    op.drop_table("denial_categories")
