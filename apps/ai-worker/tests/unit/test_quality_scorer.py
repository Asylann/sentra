"""Unit tests for the Quality Score calculation. No external dependencies."""
import pytest
from src.application.services.quality_scorer import compute_quality_score, should_block_merge
from src.domain.entities.review_finding import ReviewFinding, Severity, Category


def make_finding(severity: Severity) -> ReviewFinding:
    return ReviewFinding(
        file_path="test.py", line_start=1, line_end=1,
        category=Category.SECURITY, severity=severity,
        title="test", description="test desc", suggested_fix="fix here",
    )


def test_no_findings_returns_100():
    assert compute_quality_score([]) == 100


def test_critical_deducts_25():
    assert compute_quality_score([make_finding(Severity.CRITICAL)]) == 75


def test_two_high_deduct_30():
    assert compute_quality_score([make_finding(Severity.HIGH)] * 2) == 70


def test_score_never_goes_negative():
    findings = [make_finding(Severity.CRITICAL)] * 10  # -250 points
    assert compute_quality_score(findings) == 0


def test_blocks_merge_below_80():
    assert should_block_merge([make_finding(Severity.HIGH)] * 2, score=70) is True


def test_blocks_merge_on_critical_regardless_of_score():
    assert should_block_merge([make_finding(Severity.CRITICAL)], score=90) is True


def test_allows_merge_above_80_no_critical():
    assert should_block_merge([make_finding(Severity.LOW)], score=99) is False


def test_entropy_scanner():
    from src.infrastructure.ast_engine.entropy_scanner import is_high_entropy_secret
    assert is_high_entropy_secret("AKIAIOSFODNN7EXAMPLE123") is True
    assert is_high_entropy_secret("hello_world") is False

