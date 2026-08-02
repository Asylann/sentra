"""
AnalyzePullRequestUseCase — Core business orchestrator.

Full pipeline flow (Research4 §"Pipeline", Research1 §3.2):
  1. Fetch git diff via DiffFetcherProtocol
  2. Apply multi-stage context pruning (Research3 §"Token Optimization"):
     - Stage 1: Exclude lock files, binaries, generated code
     - Stage 2: Strip git metadata headers
     - Stage 3: AST isolation — extract only changed function/class bodies
  3. Query pgvector for developer error history and org policies (RAG)
  4. Level 1 scan: Shannon entropy + regex (catches secrets in <50ms)
  5. Build LLM prompt with SYSTEM_AND_TOOLS cache strategy (Research1 §3.4)
  6. Send to BedrockClaudeClient via LLMClientProtocol
  7. Validate structured JSON output (Tool Use guarantees schema compliance)
  8. Compute Quality Score via weighted deduction formula (Research5 §2.2)
  9. POST GitHub Check Run (in_progress) → PATCH (completed, conclusion)
  10. Persist findings + metrics to PostgreSQL (for DORA Dashboard)

Depends ONLY on domain Protocols (interfaces). All implementations are injected.
"""
from ...domain.ports.llm_client import LLMClientProtocol
from ...domain.ports.diff_fetcher import DiffFetcherProtocol
from ...domain.ports.check_runs_client import CheckRunsClientProtocol
from ...domain.entities.pull_request import PullRequest
from ..services.context_pruner import ContextPruner
from ..services.quality_scorer import compute_quality_score, should_block_merge


class AnalyzePullRequestUseCase:
    def __init__(
        self,
        diff_fetcher: DiffFetcherProtocol,
        llm_client: LLMClientProtocol,
        check_runs_client: CheckRunsClientProtocol,
    ) -> None:
        self._diff_fetcher = diff_fetcher
        self._llm_client = llm_client
        self._check_runs = check_runs_client
        self._pruner = ContextPruner()

    async def execute(self, pull_request: PullRequest) -> None:
        """Run the complete analysis pipeline for a single Pull Request."""
        raw_diff = await self._diff_fetcher.fetch_diff(pull_request)
        pruned_diff = self._pruner.prune(raw_diff)
        findings = await self._llm_client.analyze_code(
            pull_request=pull_request,
            diff_content=pruned_diff,
            system_context="",  # TODO Phase 7: inject RAG context
        )
        score = compute_quality_score(findings)
        blocked = should_block_merge(findings, score)
        # TODO Phase 8: POST check run, PATCH with conclusion

