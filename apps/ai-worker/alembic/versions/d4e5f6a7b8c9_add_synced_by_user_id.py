"""Add synced_by_user_id to organization_repositories

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-08-14 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('organization_repositories', sa.Column('synced_by_user_id', sa.BigInteger(), nullable=True))
    op.create_foreign_key('fk_org_repos_synced_by', 'organization_repositories', 'users', ['synced_by_user_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    op.drop_constraint('fk_org_repos_synced_by', 'organization_repositories', type_='foreignkey')
    op.drop_column('organization_repositories', 'synced_by_user_id')
