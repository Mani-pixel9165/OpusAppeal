"""drop denial description columns

Revision ID: 0008_drop_denial_desc
Revises: 0007_code_descriptions
Create Date: 2026-05-10
"""

from alembic import op
import sqlalchemy as sa


revision = "0008_drop_denial_desc"
down_revision = "0007_code_descriptions"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_column("denials", "reason_desc")
    op.drop_column("denials", "remark_desc")


def downgrade():
    op.add_column("denials", sa.Column("remark_desc", sa.Text(), nullable=True))
    op.add_column("denials", sa.Column("reason_desc", sa.Text(), nullable=True))
