"""
QualityScorer — Square Root Density Model.

Solves the "Volume Paradox" present in naive flat-penalty scoring systems
(e.g. SonarQube's raw issue count). A developer writing a 5,000-line PR
should not be graded identically to one writing 50 lines for the same
proportional error density.

Algorithm
---------
1. CRITICAL gate (Enterprise Gatekeeper):
   Security does not scale. Any CRITICAL finding immediately returns
   score=0, conclusion="failure". No math, no mercy.

2. Square Root Density (for HIGH / MEDIUM / LOW / INFO):
   - Accumulate raw penalty points using SEVERITY_WEIGHTS.
   - Normalize by sqrt(lines_changed) rather than lines_changed.
     Rationale: linear density (penalty/lines) is trivially gamed by
     committing thousands of blank lines or auto-generated files.
     sqrt smoothing makes the denominator grow sub-linearly so bulk
     additions yield diminishing returns.
   - density_penalty = total_penalty / max(sqrt(lines_changed), 1)
   - final_score = max(0, min(100, int(100 - density_penalty * SCORE_MULTIPLIER)))

3. Conclusion gate (merge blocker):
   conclusion = "failure" if score < threshold OR any HIGH finding present.
   HIGH findings are architecture/security weaknesses; they block the merge
   regardless of PR volume.

Worked examples (SCORE_MULTIPLIER=5.0, threshold=80):
  - 3 INFO, 10 lines:   penalty=3, density=3/3.16=0.95, score=95  → success
  - 1 HIGH, 10 lines:   penalty=15, density=15/3.16=4.74, score=76 → failure (score+HIGH gate)
  - 3 MEDIUM, 100 lines: penalty=15, density=15/10=1.5, score=92  → success
  - 3 MEDIUM, 10 lines:  penalty=15, density=15/3.16=4.74, score=76 → failure
  - 1 CRITICAL, any:    score=0 → failure (instant gate)
"""
import logging
import math
from typing import List, Dict, Any, Tuple

logger = logging.getLogger(__name__)


class QualityScorer:
    # Penalty weights for non-CRITICAL severities.
    # CRITICAL is handled by the instant-0 gate above, not by these weights.
    SEVERITY_WEIGHTS: Dict[str, int] = {
        "HIGH": 15,
        "MEDIUM": 5,
        "LOW": 2,
        "INFO": 1,
    }

    # Tuned so that a moderate error density produces a meaningful deduction
    # without making any single finding catastrophic on large PRs.
    # At sqrt(100)=10: 1 MEDIUM → -2.5 pts, 1 HIGH → -7.5 pts
    # At sqrt(10)=3.16: 1 MEDIUM → -7.9 pts, 1 HIGH → -23.7 pts
    SCORE_MULTIPLIER: float = 5.0

    @classmethod
    def evaluate(
        cls,
        findings: List[Dict[str, Any]],
        lines_changed: int = 100,
        threshold: int = 80,
    ) -> Tuple[int, str]:
        """
        Calculate the quality score using the Square Root Density model.

        Args:
            findings:      All findings (deterministic + LLM scanners combined).
            lines_changed: PR volume: total lines added + deleted.
                           Used as the normalization denominator.
                           Defaults to 100 (neutral) when unavailable.
            threshold:     Minimum passing score from org quality_gate_threshold.

        Returns:
            (quality_score: int 0-100, conclusion: "success" | "failure")
        """
        counts: Dict[str, int] = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
        has_critical = False
        total_penalty = 0

        for finding in findings:
            severity = finding.get("severity", "INFO").upper()
            counts[severity] = counts.get(severity, 0) + 1

            if severity == "CRITICAL":
                has_critical = True
            else:
                total_penalty += cls.SEVERITY_WEIGHTS.get(severity, 0)

        # ── 1. Enterprise Gatekeeper ──────────────────────────────────────────
        if has_critical:
            logger.info(
                "QualityScorer: CRITICAL finding present → score=0, conclusion=failure "
                "(Enterprise Gatekeeper rule)"
            )
            return 0, "failure"

        # ── 2. Square Root Density ────────────────────────────────────────────
        # Clamp lines_changed to at least 1 to avoid division by zero.
        sqrt_lines = max(math.sqrt(max(lines_changed, 1)), 1.0)
        density_penalty = total_penalty / sqrt_lines
        quality_score = max(0, min(100, int(100 - density_penalty * cls.SCORE_MULTIPLIER)))

        # ── 3. Conclusion Gate ────────────────────────────────────────────────
        has_high = counts.get("HIGH", 0) > 0
        if quality_score < threshold or has_high:
            conclusion = "failure"
        else:
            conclusion = "success"

        logger.info(
            "QualityScorer: score=%d, conclusion=%s, lines_changed=%d, "
            "sqrt_lines=%.2f, total_penalty=%d, density_penalty=%.3f, counts=%s",
            quality_score, conclusion, lines_changed,
            sqrt_lines, total_penalty, density_penalty, counts,
        )
        return quality_score, conclusion
