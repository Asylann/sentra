"""
PullRequest — Core domain aggregate.
Pure Python dataclass with no external library dependencies.
Research1 §3.2: Domain layer uses standard Pydantic models or Dataclasses.
"""
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class PullRequest:
    """Immutable aggregate representing a GitHub Pull Request event."""
    id: int
    repository_id: int
    pull_number: int
    author_login: str
    base_branch: str
    head_sha: str
    title: str
    diff_url: str
    installation_id: int
    organization_id: Optional[int] = None

