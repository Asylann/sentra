"""
DiffFetcherProtocol — Abstract port for retrieving git diffs.
Research3 §"Git Diff Extraction":
  Primary: application/vnd.github.v3.diff endpoint (single HTTP request)
  Fallback: paginated /pulls/{number}/files (for PRs > 300 files or > 100MB)
"""
from typing import Protocol
from ..entities.pull_request import PullRequest


class DiffFetcherProtocol(Protocol):
    async def fetch_diff(self, pull_request: PullRequest) -> str: ...

