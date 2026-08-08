import logging
from dataclasses import dataclass, field
from typing import List, Optional
import httpx

from src.infrastructure.github.auth import GitHubAppAuth

logger = logging.getLogger(__name__)


@dataclass
class ReviewComment:
    path: str
    line: int
    side: str
    body: str
    start_line: Optional[int] = None


class GitHubPullRequestReviewAPI:
    """
    Posts pull request reviews with inline suggested changes via GitHub's
    Pull Request Review API (POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews).

    Suggested changes use GitHub's native ```suggestion markdown fence,
    which renders as an interactive "Apply suggestion" button in the PR UI.
    """

    def __init__(self, auth: GitHubAppAuth):
        self.auth = auth
        self.base_url = "https://api.github.com"

    async def create_review_with_suggestions(
        self,
        repo_full_name: str,
        pull_number: int,
        commit_id: str,
        comments: List[ReviewComment],
        body: str,
        installation_id: int,
        event: str = "COMMENT",
    ) -> Optional[int]:
        """
        Creates a pull request review with inline suggestion comments.

        Parameters
        ----------
        repo_full_name:
            e.g. "acme/backend"
        pull_number:
            The PR number.
        commit_id:
            The HEAD SHA of the pull request (required by GitHub to anchor comments).
        comments:
            List of inline review comments, each with a suggestion body.
        body:
            Top-level review body (summary text shown above all inline comments).
        installation_id:
            GitHub App installation ID for token generation.
        event:
            Review event type: "COMMENT", "APPROVE", or "REQUEST_CHANGES".

        Returns
        -------
        Optional[int]
            The review ID if successful, None on failure.
        """
        if not comments:
            logger.debug("No suggestion comments to post, skipping PR review creation.")
            return None

        token = await self.auth.get_installation_token(installation_id)
        url = f"{self.base_url}/repos/{repo_full_name}/pulls/{pull_number}/reviews"

        headers = {
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "Accept": "application/vnd.github.v3+json",
        }

        review_comments = []
        for c in comments:
            comment_obj = {
                "path": c.path,
                "line": c.line,
                "side": c.side,
                "body": c.body,
            }
            if c.start_line is not None and c.start_line != c.line:
                comment_obj["start_line"] = c.start_line
                comment_obj["start_side"] = c.side
            review_comments.append(comment_obj)

        payload = {
            "commit_id": commit_id,
            "body": body,
            "event": event,
            "comments": review_comments,
        }

        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(
                    url, headers=headers, json=payload, timeout=30.0
                )
                resp.raise_for_status()
                data = resp.json()
                review_id = data.get("id")
                logger.info(
                    "Created PR Review %s with %d suggestion(s) on %s#%d",
                    review_id,
                    len(comments),
                    repo_full_name,
                    pull_number,
                )
                return review_id
            except httpx.HTTPStatusError as e:
                logger.error(
                    "Failed to create PR review on %s#%d: HTTP %d — %s",
                    repo_full_name,
                    pull_number,
                    e.response.status_code,
                    e.response.text[:500],
                )
                return None
            except Exception as e:
                logger.error("Unexpected error creating PR review: %s", e)
                return None
