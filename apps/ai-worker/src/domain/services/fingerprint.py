import hashlib

def generate_fingerprint(file_path: str, line: int, rule_id: str, snippet: str) -> str:
    """
    Generates a stable, deterministic SHA-256 fingerprint for a specific code review finding.
    Used exclusively for the Suppression/False-Positive ignoring system.
    """
    # We normalize whitespace to prevent trivial formatting changes from breaking the suppression fingerprint
    normalized_snippet = " ".join(snippet.split())
    
    # We purposefully exclude the line number from the hash payload payload.
    # If a developer adds a newline at the top of the file, all line numbers shift.
    # Hashing the line number would instantly break all active suppressions.
    # The combination of file path, rule ID (category/title), and the exact normalized snippet is stable.
    payload = f"{file_path}:{rule_id}:{normalized_snippet}".encode('utf-8')
    
    return hashlib.sha256(payload).hexdigest()
