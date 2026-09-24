"""add user name fields

Revision ID: 0009_add_user_name_fields
Revises: 0008_drop_denial_description_columns
Create Date: 2026-05-13
"""

from alembic import op
import sqlalchemy as sa


revision = "0009_add_user_name_fields"
down_revision = "0008_drop_denial_desc"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("first_name", sa.String(length=120), nullable=True))
    op.add_column("users", sa.Column("middle_name", sa.String(length=120), nullable=True))
    op.add_column("users", sa.Column("last_name", sa.String(length=120), nullable=True))
    op.execute("UPDATE users SET first_name = username, last_name = '' WHERE first_name IS NULL")
    op.alter_column("users", "first_name", existing_type=sa.String(length=120), nullable=False)
    op.alter_column("users", "last_name", existing_type=sa.String(length=120), nullable=False)


def downgrade():
    op.drop_column("users", "last_name")
    op.drop_column("users", "middle_name")
    op.drop_column("users", "first_name")
