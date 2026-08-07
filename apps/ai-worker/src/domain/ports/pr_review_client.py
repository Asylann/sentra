from typing import Protocol
from ..entities.review_finding import ReviewFinding


class PRReviewClientProtocol(Protocol):
    async def submit_suggestions(
        self,
        repo: str,
        pull_number: int,
        head_sha: str,
        installation_id: int,
        findings: list[ReviewFinding],
    ) -> None: ...
