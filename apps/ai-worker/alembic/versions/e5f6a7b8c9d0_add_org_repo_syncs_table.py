"""Add organization_repository_syncs table

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-08-14 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'organization_repository_syncs',
        sa.Column('org_id', sa.BigInteger(), nullable=False),
        sa.Column('repo_id', sa.BigInteger(), nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint('org_id', 'repo_id', 'user_id'),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['repo_id'], ['repositories.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )
    op.create_index('idx_org_repo_syncs_user', 'organization_repository_syncs', ['org_id', 'user_id'])


def downgrade() -> None:
    op.drop_index('idx_org_repo_syncs_user', table_name='organization_repository_syncs')
    op.drop_table('organization_repository_syncs')
