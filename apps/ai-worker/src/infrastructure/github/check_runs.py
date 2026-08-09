import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import httpx

from src.infrastructure.github.auth import GitHubAppAuth

logger = logging.getLogger(__name__)

class GitHubCheckRunsAPI:
    """
    Adapter for interacting with the GitHub Check Runs API.
    Posts 'in_progress' states and publishes inline code annotations back to the Pull Request.
    """
    def __init__(self, auth: GitHubAppAuth):
        self.auth = auth
        self.base_url = "https://api.github.com"

    def _map_severity(self, internal_severity: str) -> str:
        """Maps internal Sentra severities to strict GitHub annotation levels."""
        mapping = {
            "CRITICAL": "failure",
            "HIGH": "failure",
            "MEDIUM": "warning",
            "LOW": "notice",
            "INFO": "notice"
        }
        return mapping.get(internal_severity.upper(), "notice")

    async def create_check_run(self, repo_full_name: str, head_sha: str, installation_id: int) -> Optional[int]:
        """
        Creates an 'in_progress' Check Run precisely when analysis begins.
        Returns the generated check_run_id.
        """
        token = await self.auth.get_installation_token(installation_id)
        url = f"{self.base_url}/repos/{repo_full_name}/check-runs"
        
        headers = {
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "Accept": "application/vnd.github.v3+json",
        }
        
        payload = {
            "name": "Sentra AI Security Review",
            "head_sha": head_sha,
            "status": "in_progress",
            "started_at": datetime.now(timezone.utc).isoformat()
        }

        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(url, headers=headers, json=payload, timeout=10.0)
                resp.raise_for_status()
                data = resp.json()
                logger.info(f"Created Check Run ID {data['id']} for {head_sha}")
                return data['id']
            except Exception as e:
                logger.error(f"Failed to create GitHub Check Run: {e}")
                return None

    async def complete_check_run(
        self, 
        repo_full_name: str, 
        check_run_id: int, 
        conclusion: str, 
        summary: str, 
        findings: List[Dict[str, Any]],
        installation_id: int
    ):
        """
        Completes the check run and posts inline code annotations.
        CRITICAL ARCHITECTURE: Automatically batches requests to respect GitHub's 50-annotation hard limit.
        """
        if not check_run_id:
            logger.warning("No check_run_id provided, skipping completion.")
            return

        token = await self.auth.get_installation_token(installation_id)
        url = f"{self.base_url}/repos/{repo_full_name}/check-runs/{check_run_id}"
        
        headers = {
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "Accept": "application/vnd.github.v3+json",
        }

        # 1. Transform internal schema to GitHub Annotation format.
        # IMPORTANT: Check Run annotation `message` is PLAIN TEXT — GitHub never
        # renders markdown in annotations. Keep it clean and human-readable.
        annotations = []
        for finding in findings:
            line_start = finding.get('line_start', 1)
            if line_start < 1:
                line_start = 1
            line_end = finding.get('line_end', line_start)
            if not line_end or line_end < line_start:
                line_end = line_start

            severity = finding.get('severity', 'INFO').upper()
            category = finding.get('category', '')
            description = finding.get('description', '')
            suggested_fix = finding.get('suggested_fix', '').strip()

            # Plain text — NO markdown bold/code fences (they appear literally in annotations)
            category_part = f" [{category}]" if category else ""
            message_parts = [
                f"[{severity}]{category_part}",
                "",
                description,
            ]

            if suggested_fix:
                # Strip any markdown fences the LLM may have added — show as plain diff text
                inner = suggested_fix
                if inner.startswith("```"):
                    lines_of_fix = inner.splitlines()
                    closing = next(
                        (i for i in range(len(lines_of_fix) - 1, 0, -1) if lines_of_fix[i].strip() == "```"),
                        None,
                    )
                    if closing:
                        inner = "\n".join(lines_of_fix[1:closing])
                message_parts += ["", "Suggested Fix:", inner]

            annotations.append({
                "path": finding.get('file_path', 'unknown_file'),
                "start_line": line_start,
                "end_line": line_end,
                "annotation_level": self._map_severity(severity),
                "title": finding.get('title', 'Analysis Finding'),
                "message": "\n".join(message_parts),
            })

        # 2. Chunk arrays into sizes of 50 to avoid HTTP 422 Unprocessable Entity
        batches = [annotations[i:i + 50] for i in range(0, len(annotations), 50)]
        
        async with httpx.AsyncClient() as client:
            # Base case: 0 findings
            if not batches:
                payload = {
                    "status": "completed",
                    "conclusion": conclusion,
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "output": {
                        "title": "Sentra AI Analysis Complete",
                        "summary": summary
                    }
                }
                try:
                    resp = await client.patch(url, headers=headers, json=payload, timeout=10.0)
                    resp.raise_for_status()
                    logger.info("Check Run marked complete (0 findings)")
                except Exception as e:
                    logger.error(f"Failed to complete Check Run: {e}")
                return

            # Batch case: Sequentially PATCH the API
            for idx, batch in enumerate(batches):
                is_last = (idx == len(batches) - 1)
                
                payload = {
                    "output": {
                        "title": "Sentra AI Analysis Complete",
                        "summary": summary,
                        "annotations": batch
                    }
                }
                
                # Only explicitly close the Check Run on the absolute final payload chunk
                if is_last:
                    payload["status"] = "completed"
                    payload["conclusion"] = conclusion
                    payload["completed_at"] = datetime.now(timezone.utc).isoformat()
                
                try:
                    resp = await client.patch(url, headers=headers, json=payload, timeout=15.0)
                    resp.raise_for_status()
                    logger.debug(f"Successfully posted annotation batch {idx+1}/{len(batches)}")
                except Exception as e:
                    logger.error(f"Failed to patch Check Run annotations (batch {idx+1}): {e}")
                    
        logger.info(f"Check Run {check_run_id} completely finalized with conclusion={conclusion}")
