"""
AnalyzePullRequestUseCase — Core business orchestrator.

Pipeline flow:
  1. Fetch git diff via DiffFetcherProtocol
  2. Apply multi-stage context pruning
  3. Query pgvector for developer error history and org policies (RAG)
  4. Send to LLM for structured analysis
  5. Compute Quality Score
  6. POST GitHub Check Run with summary + annotation-only findings
  7. POST GitHub PR Review with ```suggestion fences for auto-fixable findings
  8. Persist findings + metrics to PostgreSQL
"""
import logging
from typing import List

from ...domain.ports.llm_client import LLMClientProtocol
from ...domain.ports.diff_fetcher import DiffFetcherProtocol
from ...domain.ports.check_runs_client import CheckRunsClientProtocol
from ...domain.ports.pr_review_client import PRReviewClientProtocol
from ...domain.ports.rag_context_provider import RAGContextProviderProtocol
from ...domain.entities.pull_request import PullRequest
from ...domain.entities.review_finding import ReviewFinding
from ..services.context_pruner import ContextPruner
from ..services.quality_scorer import QualityScorer

logger = logging.getLogger(__name__)


class AnalyzePullRequestUseCase:
    def __init__(
        self,
        diff_fetcher: DiffFetcherProtocol,
        llm_client: LLMClientProtocol,
        check_runs_client: CheckRunsClientProtocol,
        pr_review_client: PRReviewClientProtocol | None = None,
        rag_provider: RAGContextProviderProtocol | None = None,
    ) -> None:
        self._diff_fetcher = diff_fetcher
        self._llm_client = llm_client
        self._check_runs = check_runs_client
        self._pr_review = pr_review_client
        self._pruner = ContextPruner()
        self._rag = rag_provider

    async def execute(self, pull_request: PullRequest) -> None:
        """Run the complete analysis pipeline for a single Pull Request."""
        raw_diff = await self._diff_fetcher.fetch_diff(pull_request)
        pruned_diff = self._pruner.prune(raw_diff)

        system_context = ""
        if self._rag and pull_request.organization_id:
            system_context = await self._rag.get_context_for_pr(
                organization_id=pull_request.organization_id,
                repository_id=pull_request.repository_id,
                author_login=pull_request.author_login,
            )

        findings = await self._llm_client.analyze_code(
            pull_request=pull_request,
            diff_content=pruned_diff,
            system_context=system_context,
        )

        quality_score, conclusion = QualityScorer.evaluate(
            [{"severity": f.severity.value} for f in findings]
        )

        check_run_id = await self._check_runs.create_check_run(
            repo=pull_request.diff_url.split("/pulls/")[0].split("repos/")[-1]
            if "/pulls/" in pull_request.diff_url
            else f"repo/{pull_request.repository_id}",
            head_sha=pull_request.head_sha,
        )

        summary = self._build_check_run_summary(findings, quality_score)
        await self._check_runs.complete_check_run(
            check_run_id=check_run_id,
            quality_score=quality_score,
            findings=findings,
        )

        if self._pr_review:
            suggestable = [f for f in findings if f.has_suggestion]
            if suggestable:
                await self._pr_review.submit_suggestions(
                    repo=pull_request.diff_url.split("/pulls/")[0].split("repos/")[-1]
                    if "/pulls/" in pull_request.diff_url
                    else f"repo/{pull_request.repository_id}",
                    pull_number=pull_request.pull_number,
                    head_sha=pull_request.head_sha,
                    installation_id=pull_request.installation_id,
                    findings=suggestable,
                )
                logger.info(
                    "Posted %d suggested change(s) to PR #%d",
                    len(suggestable),
                    pull_request.pull_number,
                )

        logger.info(
            "Analysis complete for PR #%d: score=%d, conclusion=%s, findings=%d (suggestable=%d)",
            pull_request.pull_number,
            quality_score,
            conclusion,
            len(findings),
            len([f for f in findings if f.has_suggestion]),
        )

    @staticmethod
    def _build_check_run_summary(findings: List[ReviewFinding], quality_score: int) -> str:
        by_severity = {}
        for f in findings:
            by_severity[f.severity.value] = by_severity.get(f.severity.value, 0) + 1

        lines = [
            f"## Quality Score: {quality_score}/100\n",
            "| Severity | Count |",
            "|----------|-------|",
        ]
        for sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]:
            count = by_severity.get(sev, 0)
            if count > 0:
                lines.append(f"| {sev} | {count} |")

        suggestable_count = len([f for f in findings if f.has_suggestion])
        if suggestable_count:
            lines.append(
                f"\n> {suggestable_count} finding(s) have auto-fix suggestions "
                "posted as PR review comments."
            )

        return "\n".join(lines)
