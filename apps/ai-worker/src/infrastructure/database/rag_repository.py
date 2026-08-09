import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text

logger = logging.getLogger(__name__)


class RAGRepository:
    """
    Infrastructure adapter for querying PostgreSQL/pgvector for RAG context.
    Designed to be injected into the Application layer via Dependency Inversion.

    Provides:
      - get_org_policy(org_id, repo_id): Fetches quality gate threshold, custom rules,
        analysis focus categories, auto_approve_enabled, and daily_pr_limit.
      - get_pr_count_today(org_id, author_login): Returns how many PRs a developer
        has had analyzed today (used to enforce daily_pr_limit).
      - get_developer_metrics(developer_login): Historical error tendencies for personalized LLM feedback.
      - get_relevant_policies(repository_id, diff_text): Text of custom rules for the org/repo.
    """

    def __init__(self, db_session: Optional[AsyncSession] = None):
        self.session = db_session

    async def get_org_policy(self, org_id: int, repo_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Fetches the effective policy for an org/repo pair.

        Precedence: repo-specific policy > org-wide policy > hardcoded defaults.
        Returns a dict with all relevant settings fields.
        """
        if not self.session:
            logger.warning("No DB session — returning default policy.")
            return self._default_policy()

        try:
            from src.infrastructure.database.models import RepositoryPolicy, Organization

            # Try repo-specific policy first
            if repo_id:
                result = await self.session.execute(
                    select(RepositoryPolicy).where(
                        RepositoryPolicy.organization_id == org_id,
                        RepositoryPolicy.repository_id == repo_id,
                    ).limit(1)
                )
                policy = result.scalar_one_or_none()
                if policy:
                    return self._policy_to_dict(policy)

            # Fall back to org-wide policy (repository_id IS NULL)
            result = await self.session.execute(
                select(RepositoryPolicy).where(
                    RepositoryPolicy.organization_id == org_id,
                    RepositoryPolicy.repository_id.is_(None),
                ).limit(1)
            )
            policy = result.scalar_one_or_none()
            if policy:
                return self._policy_to_dict(policy)

            # If no policy exists yet, fall back to org-level threshold from the org table
            org_result = await self.session.execute(
                select(Organization).where(Organization.id == org_id).limit(1)
            )
            org = org_result.scalar_one_or_none()
            if org:
                return {
                    **self._default_policy(),
                    "quality_gate_threshold": org.quality_gate_threshold,
                    "daily_pr_limit": org.daily_pr_limit,
                }

        except Exception as e:
            logger.error(f"Failed to fetch org policy: {e}")

        return self._default_policy()

    def _policy_to_dict(self, policy) -> Dict[str, Any]:
        return {
            "quality_gate_threshold": policy.quality_gate_threshold,
            "block_on_critical": policy.block_on_critical,
            "enabled_categories": list(policy.enabled_categories or []),
            "ignore_paths": list(policy.ignore_paths or []),
            "custom_rules_text": policy.custom_rules_text or "",
            "max_findings_per_pr": policy.max_findings_per_pr,
            "auto_approve_enabled": policy.auto_approve_enabled,
            "analysis_focus": list(getattr(policy, 'analysis_focus', None) or [
                'Security', 'Complexity', 'Performance', 'Style'
            ]),
        }

    def _default_policy(self) -> Dict[str, Any]:
        return {
            "quality_gate_threshold": 80,
            "block_on_critical": True,
            "enabled_categories": ["Security", "Complexity", "Architecture", "Style"],
            "ignore_paths": [],
            "custom_rules_text": "",
            "max_findings_per_pr": 50,
            "auto_approve_enabled": False,
            "analysis_focus": ["Security", "Complexity", "Performance", "Style"],
            "daily_pr_limit": 7,
        }

    async def get_pr_count_today(self, org_id: int, author_login: str) -> int:
        """
        Returns the number of PRs analyzed for this author in this org today (UTC).
        Used to enforce the daily_pr_limit gate before starting analysis.
        """
        if not self.session:
            return 0

        try:
            from src.infrastructure.database.models import PullRequest
            today_utc = datetime.now(timezone.utc).date()

            result = await self.session.execute(
                select(func.count(PullRequest.id)).where(
                    PullRequest.organization_id == org_id,
                    PullRequest.author_login == author_login,
                    func.date(PullRequest.created_at) == today_utc,
                    PullRequest.analysis_status == "completed",
                )
            )
            return result.scalar_one_or_none() or 0
        except Exception as e:
            logger.error(f"Failed to count PRs today: {e}")
            return 0

    async def get_developer_metrics(self, developer_login: str) -> Dict[str, Any]:
        """
        Fetches historical error tendencies for a developer to personalize LLM feedback.
        Falls back to empty data if the session is unavailable.
        """
        logger.debug(f"Querying developer metrics for {developer_login}")

        if not self.session:
            return {"login": developer_login, "historical_weaknesses": [], "total_prs_analyzed": 0}

        try:
            from src.infrastructure.database.models import Developer
            result = await self.session.execute(
                select(Developer).where(Developer.login == developer_login).limit(1)
            )
            dev = result.scalar_one_or_none()
            if not dev:
                return {"login": developer_login, "historical_weaknesses": [], "total_prs_analyzed": 0}

            # Return empty weaknesses for now since DeveloperRepositoryStat doesn't exist
            all_categories = []

            # De-dup preserving order
            seen = set()
            unique_weaknesses = [c for c in all_categories if c not in seen and not seen.add(c)]

            return {
                "login": developer_login,
                "historical_weaknesses": unique_weaknesses[:5],  # Top 5
                "total_prs_analyzed": dev.total_prs,
            }
        except Exception as e:
            logger.error(f"Failed to fetch developer metrics: {e}")
            return {"login": developer_login, "historical_weaknesses": [], "total_prs_analyzed": 0}

    async def get_relevant_policies(self, repository_id: int, diff_text: str) -> List[str]:
        """
        Returns the custom_rules_text from the repository policy as individual rule lines.
        Falls back to a default policy set if no custom rules are defined.
        """
        logger.debug(f"Fetching custom rules for repo_id={repository_id}")

        if not self.session:
            return self._default_rules()

        try:
            from src.infrastructure.database.models import RepositoryPolicy
            result = await self.session.execute(
                select(RepositoryPolicy.custom_rules_text).where(
                    RepositoryPolicy.repository_id == repository_id,
                ).limit(1)
            )
            custom_text = result.scalar_one_or_none()

            if custom_text and custom_text.strip():
                lines = [line.strip() for line in custom_text.splitlines() if line.strip()]
                return lines

        except Exception as e:
            logger.error(f"Failed to fetch custom policies: {e}")

        return self._default_rules()

    def _default_rules(self) -> List[str]:
        return [
            "All Go API endpoints must validate JWT claims before processing the payload.",
            "Never commit hardcoded credentials or API keys. Always use secure environment variables.",
            "Database connections must be acquired from the globally managed pgxpool, never instantiated locally.",
        ]
