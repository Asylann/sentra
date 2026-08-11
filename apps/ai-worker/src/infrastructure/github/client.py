import logging
from typing import List, Optional
import httpx
from pydantic_settings import BaseSettings

from src.infrastructure.github.auth import GitHubAppAuth

logger = logging.getLogger(__name__)

class GitHubConfig(BaseSettings):
    """Loaded via pydantic-settings from .env for fail-fast validation"""
    github_app_private_key: str = ""
    github_app_id: str = ""
    
    class Config:
        env_file = ".env"
        extra = "ignore"

class GitHubClient:
    """
    Async client for GitHub API communication using httpx.
    """
    def __init__(self, auth: GitHubAppAuth):
        self.auth = auth
        self.base_url = "https://api.github.com"

    async def fetch_pull_request_diff(self, repo_full_name: str, pr_number: int, installation_id: int) -> str:
        """
        Fetches the raw unified diff for a pull request.
        Automatically falls back to paginated file fetching if the diff is too large.
        """
        token = await self.auth.get_installation_token(installation_id)
        url = f"{self.base_url}/repos/{repo_full_name}/pulls/{pr_number}"
        
        headers = {
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "Accept": "application/vnd.github.v3.diff"
        }
        
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, timeout=30.0)
            
            # Crucial Fallback: 406 Not Acceptable (Too large), 422 Unprocessable, 403 Forbidden
            if resp.status_code in (403, 406, 422):
                logger.warning(
                    f"GitHub diff endpoint returned {resp.status_code} for {repo_full_name}#{pr_number}. "
                    "Falling back to paginated /files endpoint."
                )
                return await self.fetch_diff_paginated(repo_full_name, pr_number, installation_id)
                
            resp.raise_for_status()
            return resp.text

    async def fetch_diff_paginated(self, repo_full_name: str, pr_number: int, installation_id: int) -> str:
        """
        Hits the /files endpoint with pagination to reconstruct the patch.
        This handles PRs with >300 files where the standard diff endpoint times out or is rejected.
        """
        token = await self.auth.get_installation_token(installation_id)
        url = f"{self.base_url}/repos/{repo_full_name}/pulls/{pr_number}/files"
        headers = {
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "Accept": "application/vnd.github.v3+json"
        }
        
        diff_blocks = []
        page = 1
        per_page = 100
        
        async with httpx.AsyncClient() as client:
            while True:
                resp = await client.get(
                    url, 
                    headers=headers, 
                    params={"page": page, "per_page": per_page},
                    timeout=30.0
                )
                resp.raise_for_status()
                files = resp.json()
                
                if not files:
                    break
                    
                for f in files:
                    filename = f.get("filename")
                    patch = f.get("patch")
                    if patch:
                        diff_blocks.append(f"--- a/{filename}\n+++ b/{filename}\n{patch}")
                        
                if len(files) < per_page:
                    break
                page += 1
                
        return "\n\n".join(diff_blocks)

    async def fetch_raw_file_content(
        self,
        repo_full_name: str,
        file_path: str,
        ref: str,
        installation_id: int,
    ) -> Optional[str]:
        """
        Fetches the raw text content of a single file at a specific commit ref.

        Uses ``Accept: application/vnd.github.v3.raw`` which instructs the API
        to return the file bytes directly — no base64 decoding required.

        GitHub limits /contents/ responses to 1 MB. Files larger than that
        return a 403/404-like response; we return ``None`` in those cases so
        the caller can fall back to diff-only pruning.

        Parameters
        ----------
        repo_full_name:
            e.g. ``"acme/backend"``
        file_path:
            Repository-relative path, e.g. ``"src/api/client.py"``
        ref:
            A full commit SHA, branch name, or tag.  Using ``head_sha`` gives
            the file as it will look *after* the PR is merged.
        installation_id:
            GitHub App installation ID used to mint an ephemeral access token.

        Returns
        -------
        Optional[str]
            Raw UTF-8 file content, or ``None`` if the file cannot be fetched.
        """
        token = await self.auth.get_installation_token(installation_id)
        url = f"{self.base_url}/repos/{repo_full_name}/contents/{file_path}"
        headers = {
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            # This magic Accept header tells GitHub to stream raw bytes instead
            # of a JSON envelope with base64-encoded content.
            "Accept": "application/vnd.github.v3.raw",
        }

        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(
                    url,
                    headers=headers,
                    params={"ref": ref},
                    timeout=20.0,
                )
                if resp.status_code == 200:
                    return resp.text
                # 403 = file too large (>1MB) for /contents/ API
                # 404 = deleted file or path typo
                logger.warning(
                    "fetch_raw_file_content: HTTP %s for %s@%s — skipping full-content resolution.",
                    resp.status_code,
                    file_path,
                    ref[:8],
                )
                return None
            except httpx.TimeoutException:
                logger.warning(
                    "fetch_raw_file_content: timeout fetching %s@%s.", file_path, ref[:8]
                )
                return None
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "fetch_raw_file_content: unexpected error for %s: %s", file_path, exc
                )
                return None

    async def get_file_content(
        self,
        repo_full_name: str,
        commit_sha: str,
        file_path: str,
        installation_id: int,
    ) -> Optional[str]:
        """
        Fetches the raw text content of ``file_path`` from the repository's
        file tree at the exact ``commit_sha`` (typically the PR's ``head.sha``).

        This intentionally queries the *repository tree*, not the PR diff, so
        the file is returned even when it was not modified in the current PR.
        A 404 (file absent in this repo/branch) is handled gracefully by
        returning ``None`` — callers should treat ``None`` as "no config present".

        Parameters
        ----------
        repo_full_name:
            e.g. ``"acme/backend"``
        commit_sha:
            Full SHA of the commit to read the file from (use ``head.sha``).
        file_path:
            Repository-relative path, e.g. ``".sentra.yml"``.
        installation_id:
            GitHub App installation ID used to mint an ephemeral access token.

        Returns
        -------
        Optional[str]
            Raw UTF-8 file content, or ``None`` if the file does not exist or
            cannot be fetched.
        """
        return await self.fetch_raw_file_content(
            repo_full_name=repo_full_name,
            file_path=file_path,
            ref=commit_sha,
            installation_id=installation_id,
        )

