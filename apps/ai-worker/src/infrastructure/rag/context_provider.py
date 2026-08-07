from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


class PgVectorRAGContextProvider:
    """RAG context provider backed by pgvector similarity search.

    All queries are strictly filtered by organization_id to enforce
    multi-tenant data isolation. Cross-organization data leakage is
    prevented at the query level.
    """

    def __init__(self, session_factory) -> None:
        self._session_factory = session_factory

    async def get_context_for_pr(
        self,
        organization_id: int,
        repository_id: int,
        author_login: str,
    ) -> str:
        async with self._session_factory() as session:
            developer_context = await self._get_developer_history(
                session, organization_id, repository_id, author_login
            )
            org_policies = await self._get_org_policies(
                session, organization_id, repository_id
            )
            return self._format_context(developer_context, org_policies)

    async def _get_developer_history(
        self,
        session: AsyncSession,
        organization_id: int,
        repository_id: int,
        author_login: str,
    ) -> list[dict]:
        """Fetch similar past findings for this developer within the same org."""
        query = text("""
            SELECT rf.title, rf.description, rf.category, rf.severity, rf.suggested_fix
            FROM review_findings rf
            JOIN developers d ON d.login = :author_login
            WHERE rf.organization_id = :org_id
              AND rf.repository_id = :repo_id
              AND rf.is_suppressed = FALSE
              AND EXISTS (
                  SELECT 1 FROM pull_requests pr
                  WHERE pr.id = rf.pull_request_id
                    AND pr.author_login = :author_login
              )
            ORDER BY rf.created_at DESC
            LIMIT 10
        """)
        result = await session.execute(query, {
            "org_id": organization_id,
            "repo_id": repository_id,
            "author_login": author_login,
        })
        return [dict(row._mapping) for row in result.fetchall()]

    async def _get_org_policies(
        self,
        session: AsyncSession,
        organization_id: int,
        repository_id: int,
    ) -> str | None:
        """Fetch organization/repository custom analysis rules."""
        query = text("""
            SELECT custom_rules_text
            FROM repository_policies
            WHERE organization_id = :org_id
              AND (repository_id = :repo_id OR repository_id IS NULL)
            ORDER BY repository_id NULLS LAST
            LIMIT 1
        """)
        result = await session.execute(query, {
            "org_id": organization_id,
            "repo_id": repository_id,
        })
        row = result.fetchone()
        if row and row.custom_rules_text:
            return row.custom_rules_text
        return None

    def _format_context(self, findings: list[dict], policies: str | None) -> str:
        parts = []

        if policies:
            parts.append(f"<organization_rules>\n{policies}\n</organization_rules>")

        if findings:
            parts.append("<developer_history>")
            for f in findings:
                parts.append(
                    f"- [{f['severity']}] {f['category']}: {f['title']}"
                )
                if f.get("suggested_fix"):
                    parts.append(f"  Fix: {f['suggested_fix']}")
            parts.append("</developer_history>")

        return "\n".join(parts)
