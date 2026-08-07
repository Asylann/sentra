"""Add B2B multi-tenancy tables

Revision ID: a1b2c3d4e5f6
Revises: 7cab2d66e2f1
Create Date: 2026-08-07 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '7cab2d66e2f1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('organizations', sa.Column('workspace_type', sa.Text(), nullable=False, server_default='company'))
    op.create_check_constraint('chk_orgs_workspace_type', 'organizations', "workspace_type IN ('personal', 'company')")

    op.create_table(
        'organization_users',
        sa.Column('org_id', sa.BigInteger(), nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('role', sa.Text(), nullable=False, server_default='member'),
        sa.Column('joined_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.PrimaryKeyConstraint('org_id', 'user_id'),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.CheckConstraint("role IN ('admin', 'member')", name='chk_org_users_role'),
    )

    op.create_table(
        'organization_invites',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('org_id', sa.BigInteger(), nullable=False),
        sa.Column('inviter_id', sa.BigInteger(), nullable=False),
        sa.Column('target_email', sa.Text(), nullable=False),
        sa.Column('target_github_login', sa.Text(), nullable=True),
        sa.Column('status', sa.Text(), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['inviter_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('org_id', 'target_email', name='uq_org_invites_org_email'),
        sa.CheckConstraint("status IN ('pending', 'accepted', 'declined')", name='chk_org_invites_status'),
    )

    op.add_column('users', sa.Column('current_org_id', sa.BigInteger(), nullable=True))
    op.create_foreign_key('fk_users_current_org', 'users', 'organizations', ['current_org_id'], ['id'], ondelete='SET NULL')

    op.create_index('idx_org_users_user', 'organization_users', ['user_id'])
    op.create_index('idx_org_invites_email', 'organization_invites', ['target_email'])
    op.create_index('idx_org_invites_status', 'organization_invites', ['org_id', 'status'])


def downgrade() -> None:
    op.drop_index('idx_org_invites_status', table_name='organization_invites')
    op.drop_index('idx_org_invites_email', table_name='organization_invites')
    op.drop_index('idx_org_users_user', table_name='organization_users')
    op.drop_constraint('fk_users_current_org', 'users', type_='foreignkey')
    op.drop_column('users', 'current_org_id')
    op.drop_table('organization_invites')
    op.drop_table('organization_users')
    op.drop_constraint('chk_orgs_workspace_type', 'organizations', type_='check')
    op.drop_column('organizations', 'workspace_type')
