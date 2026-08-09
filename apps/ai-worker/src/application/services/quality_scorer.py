import logging
from typing import List, Dict, Any, Tuple

logger = logging.getLogger(__name__)

class QualityScorer:
    """
    Aggregates all findings (Deterministic + LLM) and calculates the definitive Quality Score.
    Controls the final GitHub Check Run conclusion.

    The threshold parameter (default 80) comes from the organization's quality_gate_threshold
    setting, allowing admins to make the gate more or less strict via the Settings UI.
    """

    SEVERITY_WEIGHTS = {
        "CRITICAL": 25,
        "HIGH": 15,
        "MEDIUM": 5,
        "LOW": 2,
        "INFO": 1,  # must be non-zero — 3 INFOs should NOT yield 100/100
    }

    @classmethod
    def evaluate(
        cls,
        findings: List[Dict[str, Any]],
        threshold: int = 80,
    ) -> Tuple[int, str]:
        """
        Calculates QS = max(0, 100 - SUM(weight) - volume_penalty).
        Returns (quality_score, conclusion).

        Args:
            findings:  All findings from deterministic + LLM scanners.
            threshold: The minimum score to pass (from org quality_gate_threshold setting).
                       PRs scoring below this threshold receive conclusion='failure'.
                       Range: 0 (permissive) – 100 (strictest).
        """
        total_deduction = 0
        has_critical = False
        counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}

        for finding in findings:
            severity = finding.get("severity", "INFO").upper()
            weight = cls.SEVERITY_WEIGHTS.get(severity, 0)
            total_deduction += weight
            counts[severity] = counts.get(severity, 0) + 1

            if severity == "CRITICAL":
                has_critical = True

        # Volume penalty: every finding beyond the first 1 deducts 1 extra point,
        # capped at 20, so any non-trivial PR with several findings is penalized.
        total_findings = sum(counts.values())
        volume_penalty = min(20, max(0, total_findings - 1))
        total_deduction += volume_penalty

        quality_score = max(0, 100 - total_deduction)

        # Merge gate logic: fail if score < threshold, or any CRITICAL/HIGH present
        has_high_or_critical = has_critical or counts.get("HIGH", 0) > 0
        if quality_score < threshold or has_high_or_critical:
            conclusion = "failure"
        else:
            conclusion = "success"

        logger.info(
            f"Quality Score evaluated: QS={quality_score}, threshold={threshold}, "
            f"conclusion={conclusion}, volume_penalty={volume_penalty}"
        )
        return quality_score, conclusion
