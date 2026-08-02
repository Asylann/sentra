import logging
from typing import List, Dict, Any, Tuple

logger = logging.getLogger(__name__)

class QualityScorer:
    """
    Aggregates all findings (Deterministic + LLM) and calculates the definitive Quality Score.
    Controls the final GitHub Check Run conclusion.
    """

    # Defined strictly in AGENTS.md requirements
    SEVERITY_WEIGHTS = {
        "CRITICAL": 25,
        "HIGH": 15,
        "MEDIUM": 5,
        "LOW": 1,
        "INFO": 0
    }

    @classmethod
    def evaluate(cls, findings: List[Dict[str, Any]]) -> Tuple[int, str]:
        """
        Calculates QS = max(0, 100 - SUM(weight)).
        Returns (quality_score, conclusion).
        Conclusion is 'failure' if QS < 80 OR ANY CRITICAL finding is present.
        """
        total_deduction = 0
        has_critical = False

        for finding in findings:
            severity = finding.get("severity", "INFO").upper()
            weight = cls.SEVERITY_WEIGHTS.get(severity, 0)
            total_deduction += weight
            
            if severity == "CRITICAL":
                has_critical = True

        quality_score = max(0, 100 - total_deduction)

        # Merge gate logic
        if quality_score < 80 or has_critical:
            conclusion = "failure"
        else:
            conclusion = "success"

        logger.info(f"Quality Score evaluated: QS={quality_score}, conclusion={conclusion}")
        return quality_score, conclusion
