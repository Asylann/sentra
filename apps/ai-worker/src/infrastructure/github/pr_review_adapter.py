import logging
from typing import List, Dict, Any, Union

from src.domain.entities.review_finding import ReviewFinding
from src.infrastructure.github.auth import GitHubAppAuth
from src.infrastructure.github.pull_request_review import (
    GitHubPullRequestReviewAPI,
    ReviewComment,
)

logger = logging.getLogger(__name__)


class PRReviewAdapter:
    """
    Adapts findings into GitHub PR Review API calls with native ```suggestion
    fences for interactive "Apply suggestion" UX.

    Accepts both ReviewFinding domain entities and raw dict findings from the
    LLM pipeline. All findings with non-empty suggestion_code are posted as
    PR Review comments with full Markdown rendering.
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
        """Submit ReviewFinding domain entities as PR Review suggestions."""
        suggestable = [f for f in findings if f.has_suggestion]
        if not suggestable:
            return

        comments: List[ReviewComment] = []
        for finding in suggestable:
            body = self._format_suggestion_body_entity(finding)
            line_end = finding.line_end if finding.line_end else finding.line_start
            comment = ReviewComment(
                path=finding.file_path,
                line=line_end,
                side="RIGHT",
                body=body,
            )
            if finding.line_start != line_end:
                comment.start_line = finding.line_start
            comments.append(comment)

        await self._post_review(repo, pull_number, head_sha, installation_id, comments)

    async def submit_review_comments(
        self,
        repo_full_name: str,
        pull_number: int,
        head_sha: str,
        installation_id: int,
        findings: List[Dict[str, Any]],
    ) -> None:
        """Submit raw dict findings (from LLM pipeline) as PR Review suggestions."""
        if not findings:
            return

        comments: List[ReviewComment] = []
        for finding in findings:
            suggestion_code = finding.get('suggestion_code', '').strip()
            if not suggestion_code:
                continue
            body = self._format_suggestion_body_dict(finding)
            line_start = finding.get('line_start', 1)
            line_end = finding.get('line_end', line_start)
            comment = ReviewComment(
                path=finding.get('file_path', 'unknown'),
                line=line_end,
                side="RIGHT",
                body=body,
            )
            if line_start != line_end:
                comment.start_line = line_start
            comments.append(comment)

        await self._post_review(repo_full_name, pull_number, head_sha, installation_id, comments)

    async def _post_review(
        self,
        repo: str,
        pull_number: int,
        head_sha: str,
        installation_id: int,
        comments: List[ReviewComment],
    ) -> None:
        if not comments:
            return

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
    def _format_suggestion_body_entity(finding: ReviewFinding) -> str:
        severity_badge = f"**[{finding.severity.value}]**"
        category = finding.category.value if finding.category else ""
        category_tag = f" `{category}`" if category else ""
        return (
            f"{severity_badge}{category_tag} **{finding.title}**\n\n"
            f"{finding.description}\n\n"
            f"```suggestion\n"
            f"{finding.suggestion_code}\n"
            f"```"
        )

    @staticmethod
    def _format_suggestion_body_dict(finding: Dict[str, Any]) -> str:
        severity = finding.get('severity', 'INFO').upper()
        category = finding.get('category', '')
        title = finding.get('title', 'Analysis Finding')
        description = finding.get('description', '')
        suggestion_code = finding.get('suggestion_code', '')

        severity_badge = f"**[{severity}]**"
        category_tag = f" `{category}`" if category else ""

        return (
            f"{severity_badge}{category_tag} **{title}**\n\n"
            f"{description}\n\n"
            f"```suggestion\n"
            f"{suggestion_code}\n"
            f"```"
        )
