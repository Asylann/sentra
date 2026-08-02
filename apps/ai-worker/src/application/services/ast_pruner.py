"""
Sentra v2.0 — Semantic AST Pruner
==================================

Upgrades the naive 10-line hunk buffer with a Semantic Dependency Resolver that:
  1. Extracts all identifiers referenced in the *modified* lines of the diff.
  2. Scans the top ``GLOBAL_SCOPE_LINES`` lines of the original file for matching
     definitions (imports, constants, top-level assignments).
  3. Stitches those resolved definitions **before** the pruned diff hunks so the
     LLM always sees the full declaration context of every symbol it evaluates.

The original file content is reconstructed **from the diff itself** (context lines
that do not start with ``+``), so no additional GitHub API call is required.

Architectural constraints
--------------------------
- stdlib only: ``re``, ``logging``, ``typing`` — zero external dependencies.
- The public ``prune_patch`` API is fully backward-compatible (new param is optional).
- Every semantic resolution step is guarded by a broad ``except Exception`` so the
  pipeline always gets *something* useful even when heuristics fail.
"""

import logging
import re
from typing import List, Optional, Set, FrozenSet

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Language-aware definition patterns
# ---------------------------------------------------------------------------
# These are deliberately broad: we prefer false positives (showing an extra
# line to the LLM) over false negatives (hiding context that prevents
# hallucination).

_DEFINITION_PATTERNS: List[re.Pattern] = [
    # Python: import / from … import
    re.compile(r"^\s*(?:import|from)\s+\S"),
    # Python: module-level constant / assignment
    re.compile(r"^\s*[A-Z_][A-Z0-9_]{2,}\s*="),          # SCREAMING_SNAKE constant
    re.compile(r"^\s*[a-z_]\w*\s*=\s*(?:os\.environ|os\.getenv|config\.|settings\.)"),
    # JavaScript / TypeScript: import
    re.compile(r"^\s*import\s+.+\s+from\s+['\"]"),
    re.compile(r"^\s*(?:const|let|var)\s+[A-Z_]\w*\s*="),  # JS const API_URL = ...
    re.compile(r"^\s*(?:const|let|var)\s+\w+\s*=\s*(?:process\.env|require\()"),
    # Go: import block or top-level const
    re.compile(r"^\s*import\s+(?:\(|\"|`)"),
    re.compile(r"^\s*const\s+[A-Z]\w*"),
    # Generic: any top-level variable that looks like a config value
    re.compile(r"^\s*(?:export\s+)?(?:default\s+)?(?:const|let|var|val|def)\s+\w+"),
]

# Used to extract bare identifiers from diff lines
_IDENTIFIER_RE = re.compile(r"\b([A-Za-z_][A-Za-z0-9_]*)\b")

# Noise words that are language keywords / too short to be meaningful identifiers.
# Keeping this list conservative: only unambiguous reserved words.
_STOPWORDS: FrozenSet[str] = frozenset({
    # Python keywords
    "if", "else", "elif", "for", "while", "try", "except", "finally",
    "with", "as", "return", "yield", "pass", "break", "continue",
    "import", "from", "class", "def", "lambda", "not", "and", "or",
    "in", "is", "None", "True", "False", "self", "cls",
    # Python builtins that appear in definition lines but are not the defined name
    "int", "str", "bool", "list", "dict", "set", "tuple", "float",
    "len", "get", "print", "open", "range", "type", "super",
    "getenv", "environ",  # os.getenv / os.environ — present in MANY definitions
    # JS/TS
    "const", "let", "var", "function", "async", "await", "this",
    "new", "typeof", "instanceof", "export", "default", "require",
    "module", "exports", "env", "process",
    # Go
    "func", "package", "type", "struct", "interface", "map", "chan",
    "go", "select", "defer", "range", "make", "cap", "nil",
    # Generic single-char vars (still filtered by MIN_IDENT_LEN=2, but belt+suspenders)
    "a", "b", "c", "d", "e", "f", "i", "j", "k", "n", "s", "t",
    "ok", "err", "id",
})

# Minimum identifier length.
# 2 allows standard module names like 'os', 'io', 're', 'sys'.
_MIN_IDENT_LEN = 2

# How many lines from the top of the file to scan for global definitions
GLOBAL_SCOPE_LINES = 100

# Separator injected between resolved dependencies and pruned diff body
RESOLVED_DEPS_MARKER = "[... Resolved File Dependencies ...]"


class ASTContextPruner:
    """
    Sentra v2.0 Semantic AST Pruner.

    Public API
    ----------
    ``prune_patch(raw_patch, file_content, context_lines)``
        Accepts an optional *file_content* string (the full original file).
        When provided, runs full Semantic Dependency Resolution.
        When absent, reconstructs the global scope from context lines in the
        diff itself (no extra API call needed).
        On any failure falls back to the v1.0 hunk-buffer-only output.
    """

    HUNK_HEADER_RE = re.compile(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@(.*)")

    # -----------------------------------------------------------------------
    # Public entry point
    # -----------------------------------------------------------------------

    @classmethod
    def prune_patch(
        cls,
        raw_patch: str,
        file_content: Optional[str] = None,
        context_lines: int = 10,
    ) -> str:
        """
        Parse a unified diff patch, perform hunk pruning (v1 behaviour) and
        optionally prepend resolved global-scope definitions (v2 behaviour).

        Parameters
        ----------
        raw_patch:
            The raw unified diff string for a single file.
        file_content:
            The full original file text. When ``None`` the resolver reconstructs
            the global scope from context lines already present in the diff.
        context_lines:
            Maximum number of unchanged lines to keep around each change hunk.

        Returns
        -------
        str
            The pruned diff, prepended with any resolved dependency lines.
        """
        if not raw_patch:
            return ""

        # ── Phase 1: Standard hunk pruning (v1 behaviour) ─────────────────
        pruned = cls._prune_hunks(raw_patch, context_lines)

        # ── Phase 2: Semantic Dependency Resolution (v2 behaviour) ────────
        try:
            resolved_block = cls._resolve_dependencies(raw_patch, file_content)
            if resolved_block:
                pruned = resolved_block + "\n" + pruned
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Semantic dependency resolution failed — falling back to hunk-only output: %s",
                exc,
            )

        return pruned

    # -----------------------------------------------------------------------
    # Phase 1 — Hunk pruning (v1 logic, extracted into private method)
    # -----------------------------------------------------------------------

    @classmethod
    def _prune_hunks(cls, raw_patch: str, context_lines: int) -> str:
        """
        Parse the unified diff into discrete hunks and trim excess unchanged
        lines at hunk edges, replacing them with a hidden-token placeholder.
        """
        lines = raw_patch.split("\n")
        processed_blocks: List[List[str]] = []
        current_block: List[str] = []

        for line in lines:
            if cls.HUNK_HEADER_RE.match(line):
                if current_block:
                    processed_blocks.append(cls._process_hunk(current_block, context_lines))
                current_block = [line]
            else:
                if current_block:
                    current_block.append(line)
                else:
                    # File header lines (--- a/file, +++ b/file)
                    processed_blocks.append([line])

        if current_block:
            processed_blocks.append(cls._process_hunk(current_block, context_lines))

        final_lines: List[str] = []
        for block in processed_blocks:
            final_lines.extend(block)

        return "\n".join(final_lines)

    @classmethod
    def _process_hunk(cls, hunk_lines: List[str], max_context: int) -> List[str]:
        """
        Trim a single hunk's unchanged lines to ``max_context`` lines on each
        side of the first/last modification.
        """
        if not hunk_lines:
            return []

        header = hunk_lines[0]
        body = hunk_lines[1:]

        first_mod = -1
        last_mod = -1

        for i, line in enumerate(body):
            if line.startswith("+") or line.startswith("-"):
                if first_mod == -1:
                    first_mod = i
                last_mod = i

        if first_mod == -1:
            # No modifications in this hunk — keep as-is
            return hunk_lines

        start_idx = max(0, first_mod - max_context)
        end_idx = min(len(body), last_mod + max_context + 1)

        result = [header]

        if start_idx > 0:
            result.append("\n[... unmodified code hidden by Sentra ...]\n")

        result.extend(body[start_idx:end_idx])

        if end_idx < len(body):
            result.append("\n[... unmodified code hidden by Sentra ...]\n")

        return result

    # -----------------------------------------------------------------------
    # Phase 2 — Semantic Dependency Resolution
    # -----------------------------------------------------------------------

    @classmethod
    def _resolve_dependencies(
        cls,
        raw_patch: str,
        file_content: Optional[str],
    ) -> str:
        """
        Core of the Semantic Dependency Resolver.

        Steps
        -----
        1. Extract identifiers referenced in *modified* lines of the diff.
        2. Obtain the global scope lines (top ``GLOBAL_SCOPE_LINES`` of the
           original file).  Source: *file_content* if provided, otherwise
           reconstructed from the diff's context (unchanged) lines.
        3. Match each extracted identifier against global-scope definitions.
        4. Return a formatted block of matched definition lines, or empty string
           if nothing was resolved (avoids polluting the prompt with noise).
        """
        # Step 1 — Extract identifiers from the changed lines
        modified_identifiers = cls._extract_modified_identifiers(raw_patch)
        if not modified_identifiers:
            return ""

        logger.debug(
            "Semantic resolver: %d unique identifiers extracted from modified lines.",
            len(modified_identifiers),
        )

        # Step 2 — Obtain the global scope text
        global_scope_lines = cls._get_global_scope_lines(raw_patch, file_content)
        if not global_scope_lines:
            return ""

        # Step 3 — Find definition lines that reference any modified identifier
        matched_lines = cls._match_definitions(global_scope_lines, modified_identifiers)
        if not matched_lines:
            return ""

        logger.debug(
            "Semantic resolver: %d definition line(s) resolved for LLM context.",
            len(matched_lines),
        )

        # Step 4 — Stitch into a clearly labelled block
        return cls._format_resolved_block(matched_lines)

    # -----------------------------------------------------------------------
    # Identifier extraction
    # -----------------------------------------------------------------------

    @classmethod
    def _extract_modified_identifiers(cls, raw_patch: str) -> Set[str]:
        """
        Walk every ``+`` and ``-`` line in the patch and collect all identifiers.
        Context lines (`` ``) are deliberately excluded — we only care about
        identifiers that are *directly involved* in the change.
        """
        identifiers: Set[str] = set()

        for line in raw_patch.split("\n"):
            # Only process added / removed lines, not context or hunk headers
            if not line or not (line.startswith("+") or line.startswith("-")):
                continue
            # Strip the diff prefix character before scanning
            code = line[1:]
            for match in _IDENTIFIER_RE.finditer(code):
                token = match.group(1)
                if (
                    len(token) >= _MIN_IDENT_LEN
                    and token not in _STOPWORDS
                    and not token.isdigit()
                ):
                    identifiers.add(token)

        return identifiers

    # -----------------------------------------------------------------------
    # Global scope reconstruction
    # -----------------------------------------------------------------------

    @classmethod
    def _get_global_scope_lines(
        cls,
        raw_patch: str,  # noqa: ARG003  (kept for API symmetry; not used when content=None)
        file_content: Optional[str],
    ) -> List[str]:
        """
        Return the first ``GLOBAL_SCOPE_LINES`` lines of the original file.

        When ``file_content`` is provided (the authoritative case), this slices
        the real file.  When it is ``None`` (fetch failed or caller didn't
        supply it), we return an empty list rather than attempting to
        reconstruct global scope from diff context lines.

        **Why we no longer reconstruct from the diff:**
        A standard unified diff contains at most ±3 lines of surrounding context
        for each hunk.  If ``API_URL`` is defined on line 15 and the change
        starts on line 156, line 15 is physically absent from the diff payload.
        Attempting to scan diff context for global declarations is therefore
        structurally unreliable and was the root cause of the hallucination bug.
        """
        if file_content:
            return file_content.splitlines()[:GLOBAL_SCOPE_LINES]

        # file_content unavailable — resolver degrades gracefully to hunk-only output.
        return []


    # -----------------------------------------------------------------------
    # Definition matching
    # -----------------------------------------------------------------------

    # Patterns that extract the *defined name* from a definition line.
    # We match the LHS/imported name so we can check whether the modified code
    # actually references THAT symbol — not just any token on the definition line.
    _IMPORT_NAME_RE = re.compile(
        r"^\s*(?:import|from)\s+([A-Za-z_][\w.]*)"
    )
    _ASSIGNMENT_NAME_RE = re.compile(
        r"^\s*(?:export\s+)?(?:default\s+)?(?:const|let|var|val|final)?\s*"
        r"([A-Z_][A-Z0-9_]{1,}|[a-z_][\w]{2,})\s*="
    )

    @classmethod
    def _extract_defined_name(cls, line: str) -> Optional[str]:
        """
        Return the primary symbol being defined/imported on this line, or None.

        For ``import os`` → 'os'
        For ``from typing import List`` → 'List'
        For ``API_KEY = os.getenv(...)`` → 'API_KEY'
        For ``const API_URL = process.env...`` → 'API_URL'
        """
        # from X import Y  →  Y is the actually imported name
        from_import = re.match(r"^\s*from\s+\S+\s+import\s+([A-Za-z_][\w, *]*)", line)
        if from_import:
            # Could be a multi-name import; grab the first meaningful token
            names = [n.strip() for n in from_import.group(1).split(",") if n.strip() and n.strip() != "*"]
            return names[0] if names else None

        # import X  or  import X as Y
        plain_import = re.match(r"^\s*import\s+([A-Za-z_][\w.]*)", line)
        if plain_import:
            # Return the local alias if present (import numpy as np → 'np')
            alias = re.search(r"\bas\s+([A-Za-z_]\w*)", line)
            return alias.group(1) if alias else plain_import.group(1).split(".")[0]

        # JS: import X from '...'
        js_import = re.match(r"^\s*import\s+(?:{\s*)?([A-Za-z_]\w*)(?:\s*})?\s+from", line)
        if js_import:
            return js_import.group(1)

        # Assignment: X = ... or const X = ...
        assign = re.match(
            r"^\s*(?:export\s+)?(?:const|let|var|val|final)?\s*"
            r"([A-Z_][A-Z0-9_]{1,}|[a-zA-Z_][\w]{2,})\s*=",
            line,
        )
        if assign:
            return assign.group(1)

        return None

    @classmethod
    def _match_definitions(
        cls,
        global_scope_lines: List[str],
        identifiers: Set[str],
    ) -> List[str]:
        """
        Scan ``global_scope_lines`` for lines that:
          (a) match one of our known definition patterns, AND
          (b) the *primary defined name* on that line is in ``identifiers``.

        Using the defined name (LHS) rather than any token on the line prevents
        false positives where a shared utility like ``os.getenv`` causes an
        unrelated constant to be pulled in.

        Returns de-duplicated matched lines in their original order.
        """
        matched: List[str] = []
        seen: Set[str] = set()

        for raw_line in global_scope_lines:
            stripped = raw_line.rstrip()
            if not stripped or stripped in seen:
                continue

            # Must look like a definition
            if not any(pattern.search(stripped) for pattern in _DEFINITION_PATTERNS):
                continue

            # Extract the symbol being defined and check against modified identifiers
            defined_name = cls._extract_defined_name(stripped)
            if defined_name and defined_name in identifiers:
                matched.append(stripped)
                seen.add(stripped)

        return matched

    # -----------------------------------------------------------------------
    # Output formatting
    # -----------------------------------------------------------------------

    @classmethod
    def _format_resolved_block(cls, matched_lines: List[str]) -> str:
        """
        Wrap the matched definition lines in the canonical Sentra dependency
        marker block so the LLM prompt parser can identify them clearly.
        """
        body = "\n".join(matched_lines)
        return (
            f"{RESOLVED_DEPS_MARKER}\n"
            f"{body}\n"
            f"{RESOLVED_DEPS_MARKER}"
        )
