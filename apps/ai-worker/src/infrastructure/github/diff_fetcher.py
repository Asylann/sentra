"""
GitHubDiffFetcher — Implements DiffFetcherProtocol.
Research3 §"Git Diff Extraction":
  Primary:  GET /repos/{owner}/{repo}/pulls/{number}
            Accept: application/vnd.github.v3.diff
  Fallback: GET /repos/{owner}/{repo}/pulls/{number}/files?page=N&per_page=100
            Activated when PR > 300 files or response is 422 Unprocessable Entity.
Authentication: GitHub App Installation Token (cached in Redis, TTL = token expiry).
Research2 §3.3: Redis caches installation tokens to avoid rate limit exhaustion.
"""

