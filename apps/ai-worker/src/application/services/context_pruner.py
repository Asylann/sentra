"""
ContextPruner — Multi-stage diff filtering pipeline.
Research3 §"LLM Token Optimization Strategy":
  Stage 1: Exclude files with no business logic (lock files, minified assets)
  Stage 2: Strip git metadata (index hashes, mode lines, timestamp lines)
  Stage 3: AST-based function isolation via tree-sitter (Phase 6)
Average token reduction: 40-90% depending on PR type.
"""
import re
from pathlib import PurePath

EXCLUDED_EXTENSIONS = frozenset({".lock", ".sum", ".map", ".pb.go", ".pb.py"})
EXCLUDED_FILENAMES = frozenset({
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "go.sum", "Cargo.lock", "poetry.lock",
})
EXCLUDED_PATTERN = re.compile(
    r"\.(min\.js|min\.css|bundle\.js|chunk\.js|png|jpg|svg|ttf|woff2?)$"
)


class ContextPruner:
    def prune(self, raw_diff: str) -> str:
        sections = re.split(r"(?=^diff --git)", raw_diff, flags=re.MULTILINE)
        kept = [s for s in sections if not self._should_exclude(s)]
        return "\n".join(self._strip_metadata(s) for s in kept)

    def _should_exclude(self, section: str) -> bool:
        m = re.search(r"^diff --git a/(\S+)", section, re.MULTILINE)
        if not m:
            return False
        p = PurePath(m.group(1))
        return (
            p.name in EXCLUDED_FILENAMES
            or p.suffix in EXCLUDED_EXTENSIONS
            or bool(EXCLUDED_PATTERN.search(str(p)))
        )

    def _strip_metadata(self, section: str) -> str:
        return "\n".join(
            line for line in section.splitlines()
            if not line.startswith(("index ", "old mode", "new mode", "Binary files"))
        )

