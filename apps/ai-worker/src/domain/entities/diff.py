from typing import List, Optional
from pydantic import BaseModel

class FileDiff(BaseModel):
    """Represents a single file's modifications within a PR."""
    filename: str
    status: str
    raw_patch: Optional[str] = None
    additions: int = 0
    deletions: int = 0
    was_excluded: bool = False
    exclusion_reason: Optional[str] = None

class PrunedDiff(BaseModel):
    """
    Represents the aggregate diff for a PR after Context Pruning and Noise Filtering.
    This is passed to the AST / Entropy analysis stages before final LLM assembly.
    """
    repository_id: int
    pull_number: int
    files: List[FileDiff]
    
    @property
    def final_prompt_string(self) -> str:
        """Constructs the final string to send to the LLM from all included files."""
        blocks = []
        for f in self.files:
            if not f.was_excluded and f.raw_patch:
                # Add minimal file headers back for LLM context
                blocks.append(f"--- a/{f.filename}\n+++ b/{f.filename}\n{f.raw_patch}")
        return "\n\n".join(blocks)
