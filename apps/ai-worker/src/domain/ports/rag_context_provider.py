from typing import Protocol


class RAGContextProviderProtocol(Protocol):
    async def get_context_for_pr(
        self,
        organization_id: int,
        repository_id: int,
        author_login: str,
    ) -> str:
        """Retrieve RAG context strictly scoped to the given organization.

        CRITICAL: Vector search MUST filter by organization_id to prevent
        cross-tenant data leakage. One company's code context or past
        mistakes MUST NEVER leak to another company's analysis.
        """
        ...
