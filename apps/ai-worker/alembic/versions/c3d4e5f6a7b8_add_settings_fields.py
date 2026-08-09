"""Add settings fields: daily_pr_limit, auto_approve_enabled, analysis_focus

Adds the following columns to support the full Settings UI:
- organizations.daily_pr_limit      INT NOT NULL DEFAULT 7
- repository_policies.auto_approve_enabled  BOOLEAN NOT NULL DEFAULT FALSE
- repository_policies.analysis_focus        TEXT[] NOT NULL DEFAULT all categories

Revision ID: c3d4e5f6a7b8
Revises: 7cab2d66e2f1
Create Date: 2026-08-09 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add daily_pr_limit to organizations
    op.add_column(
        'organizations',
        sa.Column(
            'daily_pr_limit',
            sa.Integer(),
            nullable=False,
            server_default='7'
        )
    )

    # 2. Add auto_approve_enabled to repository_policies
    # First check if the table exists (it may not yet in all envs)
    op.add_column(
        'repository_policies',
        sa.Column(
            'auto_approve_enabled',
            sa.Boolean(),
            nullable=False,
            server_default='false'
        )
    )

    # 3. Add analysis_focus to repository_policies
    # Stores the set of categories the AI should focus on.
    # Default includes all four standard categories.
    op.add_column(
        'repository_policies',
        sa.Column(
            'analysis_focus',
            postgresql.ARRAY(sa.Text()),
            nullable=False,
            server_default="ARRAY['Security','Complexity','Performance','Style']::TEXT[]"
        )
    )


def downgrade() -> None:
    op.drop_column('repository_policies', 'analysis_focus')
    op.drop_column('repository_policies', 'auto_approve_enabled')
    op.drop_column('organizations', 'daily_pr_limit')
