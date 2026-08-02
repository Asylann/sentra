import logging
import math
import re
from typing import List, Dict, Any

from src.domain.entities.diff import PrunedDiff

logger = logging.getLogger(__name__)

class DeterministicScanner:
    """
    Level 1 Security Scanner.
    Executes fast, deterministic checks (regex + Shannon entropy) to catch obvious
    secrets (JWTs, API Keys) before handing off to the expensive LLM layer.
    """
    
    # Broad regex to catch AWS Access Key IDs
    AWS_KEY_RE = re.compile(r"AKIA[0-9A-Z]{16}")
    
    # Regex to capture potential Base64 strings (length > 20)
    # Used as a heuristic to identify JWTs, API tokens, and cryptographic keys
    B64_HEURISTIC_RE = re.compile(r"([A-Za-z0-9+/=]{20,})")

    @classmethod
    def shannon_entropy(cls, data: str) -> float:
        """Calculates the Shannon Entropy of a string to detect randomness."""
        if not data:
            return 0.0
        entropy = 0.0
        length = len(data)
        char_counts = {}
        for char in data:
            char_counts[char] = char_counts.get(char, 0) + 1
            
        for count in char_counts.values():
            p = count / length
            entropy -= p * math.log2(p)
        return entropy

    @classmethod
    def scan_diff(cls, pruned_diff: PrunedDiff) -> List[Dict[str, Any]]:
        """
        Scans a PrunedDiff for high-entropy secrets and hardcoded credentials.
        Returns findings in the identical JSON Schema format used by the LLM Tool Use.
        """
        findings = []
        
        for file_diff in pruned_diff.files:
            if file_diff.was_excluded or not file_diff.raw_patch:
                continue
                
            lines = file_diff.raw_patch.split('\n')
            current_line = 0
            
            for line in lines:
                if line.startswith('@@'):
                    # Parse hunk header: @@ -old,old_cnt +new,new_cnt @@
                    match = re.search(r'\+([0-9]+)', line)
                    if match:
                        current_line = int(match.group(1)) - 1
                    continue
                    
                if not line.startswith('+') and not line.startswith('-') and not line.startswith(' '):
                    continue

                if line.startswith('+') or line.startswith(' '):
                    current_line += 1
                
                # Only scan additions (we don't alert on code being deleted)
                if not line.startswith('+'):
                    continue
                    
                code_line = line[1:]
                
                # 1. AWS Key Regex
                for _ in cls.AWS_KEY_RE.finditer(code_line):
                    findings.append({
                        "file_path": file_diff.filename,
                        "line_start": current_line,
                        "category": "Security",
                        "severity": "CRITICAL",
                        "title": "Hardcoded AWS Access Key",
                        "description": "Detected a hardcoded AWS Access Key ID (AKIA). This is a critical security risk.",
                        "suggested_fix": "Remove the hardcoded key immediately. Rotate the compromised key in AWS IAM and use environment variables."
                    })
                    
                # 2. High Entropy Scanning
                for match in cls.B64_HEURISTIC_RE.finditer(code_line):
                    candidate = match.group(1)
                    entropy = cls.shannon_entropy(candidate)
                    if entropy > 4.5:
                        findings.append({
                            "file_path": file_diff.filename,
                            "line_start": current_line,
                            "category": "Security",
                            "severity": "CRITICAL",
                            "title": "High Entropy Secret Detected",
                            "description": f"Detected a highly random string (entropy {entropy:.2f}) exceeding the 4.5 threshold. This typically indicates a hardcoded secret, JWT, or password.",
                            "suggested_fix": "Store secrets securely in a Secrets Manager or use environment variables."
                        })
                        
        logger.info(f"Level 1 Deterministic Scanner found {len(findings)} issues.")
        return findings
