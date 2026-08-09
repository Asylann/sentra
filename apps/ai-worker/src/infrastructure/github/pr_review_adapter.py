import logging
from typing import List, Dict, Any

from src.domain.entities.review_finding import ReviewFinding
from src.infrastructure.github.auth import GitHubAppAuth
from src.infrastructure.github.pull_request_review import (
    GitHubPullRequestReviewAPI,
    ReviewComment,
)

logger = logging.getLogger(__name__)

# Severity → emoji for rich markdown badges in PR Review comments
_SEVERITY_EMOJI = {
    "CRITICAL": "🔴",
    "HIGH": "🟠",
    "MEDIUM": "🟡",
    "LOW": "🔵",
    "INFO": "⚪",
}

_SEVERITY_LABEL = {
    "CRITICAL": "Critical",
    "HIGH": "High",
    "MEDIUM": "Medium",
    "LOW": "Low",
    "INFO": "Info",
}


class PRReviewAdapter:
    """
    Posts all findings as GitHub PR Review inline comments with rich Markdown.

    - Findings WITH suggestion_code → comment body ends with a ```suggestion fence
      so GitHub renders an interactive "Apply suggestion" button.
    - Findings WITHOUT suggestion_code → comment body ends with a plain diff/code
      block showing the recommended fix, still fully Markdown-rendered.

    Both paths use the PR Review API (not Check Run annotations), which is the
    only GitHub surface that renders Markdown inside comment bodies.
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
        """Submit ReviewFinding domain entities as PR Review inline comments."""
        if not findings:
            return

        comments: List[ReviewComment] = []
        for finding in findings:
            body = self._format_finding_entity(finding)
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
        """Submit raw dict findings (from LLM pipeline) as PR Review inline comments."""
        if not findings:
            return

        comments: List[ReviewComment] = []
        for finding in findings:
            body = self._format_finding_dict(finding)
            line_start = finding.get('line_start', 1)
            line_end = finding.get('line_end', line_start)
            if not line_end or line_end < line_start:
                line_end = line_start
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

        suggestable = sum(1 for c in comments if "```suggestion" in c.body)
        summary_parts = [
            "## Sentra AI Code Review",
            "",
            f"Found **{len(comments)}** issue(s) across this pull request.",
        ]
        if suggestable:
            summary_parts.append(
                f"**{suggestable}** have one-click fixes — click **Apply suggestion** to accept."
            )
        summary_parts += [
            "",
            "> *Powered by Sentra AI — automated security and quality analysis.*",
        ]

        await self._api.create_review_with_suggestions(
            repo_full_name=repo,
            pull_number=pull_number,
            commit_id=head_sha,
            comments=comments,
            body="\n".join(summary_parts),
            installation_id=installation_id,
            event="COMMENT",
        )

    @staticmethod
    def _format_finding_entity(finding: ReviewFinding) -> str:
        severity = finding.severity.value.upper()
        emoji = _SEVERITY_EMOJI.get(severity, "⚪")
        label = _SEVERITY_LABEL.get(severity, severity)
        category = finding.category.value if finding.category else ""
        category_tag = f"`{category}`" if category else ""

        header = f"{emoji} **{label}** {category_tag} — **{finding.title}**"
        body = f"{header}\n\n{finding.description}"

        if finding.suggestion_code.strip():
            body += f"\n\n```suggestion\n{finding.suggestion_code}\n```"
        elif finding.suggested_fix.strip():
            body += f"\n\n**Suggested fix:**\n```diff\n{finding.suggested_fix}\n```"

        return body

    @staticmethod
    def _format_finding_dict(finding: Dict[str, Any]) -> str:
        severity = finding.get('severity', 'INFO').upper()
        emoji = _SEVERITY_EMOJI.get(severity, "⚪")
        label = _SEVERITY_LABEL.get(severity, severity)
        category = finding.get('category', '')
        category_tag = f"`{category}`" if category else ""
        title = finding.get('title', 'Analysis Finding')
        description = finding.get('description', '')
        suggestion_code = finding.get('suggestion_code', '').strip()
        suggested_fix = finding.get('suggested_fix', '').strip()

        header = f"{emoji} **{label}** {category_tag} — **{title}**"
        body = f"{header}\n\n{description}"

        if suggestion_code:
            body += f"\n\n```suggestion\n{suggestion_code}\n```"
        elif suggested_fix:
            # Strip any outer fences the LLM may have added
            inner = suggested_fix
            if inner.startswith("```"):
                lines = inner.splitlines()
                closing = next(
                    (i for i in range(len(lines) - 1, 0, -1) if lines[i].strip() == "```"),
                    None,
                )
                if closing:
                    inner = "\n".join(lines[1:closing])
            body += f"\n\n**Suggested fix:**\n```diff\n{inner}\n```"

        return body
