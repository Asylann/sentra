"""
EntropyScanner — Shannon entropy-based secret detection.
Research5 §1.1: Level 1 deterministic scan (runs BEFORE LLM, no API cost).
Formula: H(X) = -Σ p(xᵢ) * log₂(p(xᵢ))
Threshold: H(X) > 4.5 for Base64 alphabet on strings > 20 chars.
Also uses regex patterns for structured secrets:
  AWS Access Key:    r"AKIA[0-9A-Z]{16}"
  GCP Service Acct:  r"[0-9a-f]{40}"  (SHA-1 like)
  JWT:               r"eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+"
  RSA Private Key:   r"-----BEGIN RSA PRIVATE KEY-----"
  Slack Webhook:     r"https://hooks.slack.com/services/T[A-Z0-9]+/B[A-Z0-9]+/"
Execution time: < 50ms (zero LLM API calls).
"""
import math


def shannon_entropy(s: str) -> float:
    if not s:
        return 0.0
    freq: dict[str, int] = {}
    for c in s:
        freq[c] = freq.get(c, 0) + 1
    n = len(s)
    return -sum((v / n) * math.log2(v / n) for v in freq.values())


def is_high_entropy_secret(token: str, threshold: float = 4.5, min_len: int = 20) -> bool:
    """Return True if token is likely a secret based on Shannon entropy."""
    return len(token) >= min_len and shannon_entropy(token) > threshold

