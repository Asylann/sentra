"""
CheckRunsClientProtocol — Abstract port for GitHub Check Runs API.
Research5 §2.1: Lifecycle: POST (in_progress) → PATCH (completed).
conclusion values: "success" | "failure" | "neutral"
GitHub limit: max 50 annotations per PATCH request — batch if needed.
"""
from typing import Protocol
from ..entities.review_finding import ReviewFinding


class CheckRunsClientProtocol(Protocol):
    async def create_check_run(self, repo: str, head_sha: str) -> int: ...
    async def complete_check_run(
        self,
        check_run_id: int,
        quality_score: int,
        findings: list[ReviewFinding],
    ) -> None: ...

