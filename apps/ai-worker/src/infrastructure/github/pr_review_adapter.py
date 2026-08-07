import logging
from typing import List

from src.domain.entities.review_finding import ReviewFinding
from src.infrastructure.github.auth import GitHubAppAuth
from src.infrastructure.github.pull_request_review import (
    GitHubPullRequestReviewAPI,
    ReviewComment,
)

logger = logging.getLogger(__name__)


class PRReviewAdapter:
    """
    Adapts domain ReviewFinding entities into GitHub PR Review API calls
    with native ```suggestion fences for interactive "Apply suggestion" UX.

    Findings WITH suggestion_code -> PR Review (inline suggested changes).
    Findings WITHOUT suggestion_code -> remain on Check Run annotations only.
    """

    def __init__(self, auth: GitHubAppAuth):
        self._api = GitHubPullRequestReviewAPI(auth)

    async def submit_suggestions(
        self,
        repo: str,
        pull_number: int,
        head_sha: str,
        installation_id: int,
        findings: list[ReviewFinding],
    ) -> None:
        suggestable = [f for f in findings if f.has_suggestion]
        if not suggestable:
            return

        comments: List[ReviewComment] = []
        for finding in suggestable:
            body = self._format_suggestion_body(finding)
            comments.append(
                ReviewComment(
                    path=finding.file_path,
                    line=finding.line_start,
                    side="RIGHT",
                    body=body,
                )
            )

        summary = (
            f"**Sentra AI** found {len(comments)} auto-fixable issue(s). "
            "Click **Apply suggestion** to accept each fix directly from this review."
        )

        await self._api.create_review_with_suggestions(
            repo_full_name=repo,
            pull_number=pull_number,
            commit_id=head_sha,
            comments=comments,
            body=summary,
            installation_id=installation_id,
            event="COMMENT",
        )

    @staticmethod
    def _format_suggestion_body(finding: ReviewFinding) -> str:
        severity_badge = f"**[{finding.severity.value}]**"
        return (
            f"{severity_badge} {finding.title}\n\n"
            f"{finding.description}\n\n"
            f"```suggestion\n"
            f"{finding.suggestion_code}\n"
            f"```"
        )
