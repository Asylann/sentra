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

    # 2. Create the repository_policies table (it was missing from previous migrations)
    # This table handles both the core config and the new settings
    op.create_table(
        'repository_policies',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('repository_id', sa.BigInteger(), nullable=True),
        sa.Column('organization_id', sa.BigInteger(), nullable=False),
        sa.Column('quality_gate_threshold', sa.Integer(), server_default='80', nullable=False),
        sa.Column('block_on_critical', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('enabled_categories', postgresql.ARRAY(sa.Text()), server_default='{"Security", "Complexity", "Architecture", "Style"}', nullable=False),
        sa.Column('ignore_paths', postgresql.ARRAY(sa.Text()), server_default='{}', nullable=False),
        sa.Column('custom_rules_text', sa.Text(), nullable=True),
        sa.Column('max_findings_per_pr', sa.Integer(), server_default='50', nullable=False),
        # New Settings fields
        sa.Column('auto_approve_enabled', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('analysis_focus', postgresql.ARRAY(sa.Text()), server_default='{"Security", "Complexity", "Performance", "Style"}', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['repository_id'], ['repositories.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('repository_id', 'organization_id')
    )


def downgrade() -> None:
    op.drop_table('repository_policies')
    op.drop_column('organizations', 'daily_pr_limit')
