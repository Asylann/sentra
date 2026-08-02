"""
ReviewFinding — A single actionable issue from code analysis.
Severity weights drive the Quality Score formula (Research5 §2.2):
  CRITICAL=25, HIGH=15, MEDIUM=5, LOW=1, INFO=0
"""
from dataclasses import dataclass
from enum import Enum


class Severity(str, Enum):
    CRITICAL = "CRITICAL"   # weight=25: open secrets, SQLi, RCE
    HIGH = "HIGH"           # weight=15: IDOR, XSS, weak crypto
    MEDIUM = "MEDIUM"       # weight=5:  O(n^2) complexity, ReDoS
    LOW = "LOW"             # weight=1:  architecture violations
    INFO = "INFO"           # weight=0:  informational


class Category(str, Enum):
    SECURITY = "Security"
    COMPLEXITY = "Complexity"
    ARCHITECTURE = "Architecture"
    STYLE = "Style"


@dataclass(frozen=True)
class ReviewFinding:
    """Immutable value object representing one code analysis finding."""
    file_path: str
    line_start: int
    line_end: int
    category: Category
    severity: Severity
    title: str
    description: str
    suggested_fix: str
    fingerprint: str = ""   # SHA256 for persistent suppression (Research5 §1.2)

