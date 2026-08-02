"""Add users table for GitHub OAuth SaaS authentication (Phase 11)

Revision ID: b8c2d4e6f8a0
Revises: f0feb00a2c4e
Create Date: 2026-07-31

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import pgvector.sqlalchemy

# revision identifiers, used by Alembic.
revision: str = 'b8c2d4e6f8a0'
down_revision: Union[str, None] = 'f0feb00a2c4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Create the 'users' table for Sentra SaaS authentication.
    Users log in via GitHub OAuth; installation_id is populated
    when they install the GitHub App on their repositories.
    """
    op.create_table(
        'users',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('github_id', sa.BigInteger(), nullable=False),
        sa.Column('login', sa.Text(), nullable=False),
        sa.Column('name', sa.Text(), nullable=True),
        sa.Column('email', sa.Text(), nullable=True),
        sa.Column('avatar_url', sa.Text(), nullable=True),
        sa.Column('github_access_token', sa.Text(), nullable=True),
        sa.Column('installation_id', sa.BigInteger(), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('github_id'),
        sa.UniqueConstraint('login'),
    )
    # Indexes for fast lookups during OAuth and webhook processing
    op.create_index('idx_users_github_id', 'users', ['github_id'], unique=True)
    op.create_index('idx_users_login', 'users', ['login'], unique=True)


def downgrade() -> None:
    """Drop the users table and its indexes."""
    op.drop_index('idx_users_login', table_name='users')
    op.drop_index('idx_users_github_id', table_name='users')
    op.drop_table('users')
