"""
Unit tests for the Sentra v2.0 Semantic AST Pruner.

All tests are pure unit tests — no I/O, no mocks needed.
They exercise the four main concerns:

1. Identifier extraction from modified diff lines
2. Global scope reconstruction from file_content and from the diff itself
3. Definition matching (identifier × pattern join)
4. Full integration: prune_patch with and without file_content
5. Backward-compatibility and graceful fallback behaviour
"""

import pytest
from src.application.services.ast_pruner import (
    ASTContextPruner,
    RESOLVED_DEPS_MARKER,
    GLOBAL_SCOPE_LINES,
)


# ---------------------------------------------------------------------------
# Fixtures — representative diffs and file content
# ---------------------------------------------------------------------------

PYTHON_PATCH = """\
--- a/src/api/client.py
+++ b/src/api/client.py
@@ -1,5 +1,8 @@
 import logging
 import os
+import requests
 
-BASE_URL = "http://localhost"
+BASE_URL = os.getenv("API_BASE_URL", "http://localhost")
+API_KEY = os.getenv("API_KEY")
+
 def fetch_data(endpoint):
-    return requests.get(BASE_URL + endpoint)
+    headers = {"Authorization": f"Bearer {API_KEY}"}
+    return requests.get(BASE_URL + endpoint, headers=headers)
"""

PYTHON_FILE_CONTENT = """\
import logging
import os
import requests
from typing import Optional

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost")
API_KEY = os.getenv("API_KEY")
TIMEOUT_SECONDS = int(os.getenv("TIMEOUT", "30"))
MAX_RETRIES = 3

logger = logging.getLogger(__name__)

def fetch_data(endpoint):
    headers = {"Authorization": f"Bearer {API_KEY}"}
    return requests.get(API_BASE_URL + endpoint, headers=headers, timeout=TIMEOUT_SECONDS)
"""

JS_PATCH = """\
--- a/src/services/api.js
+++ b/src/services/api.js
@@ -10,6 +10,9 @@
 import axios from 'axios';
 const API_URL = process.env.REACT_APP_API_URL;
+const AUTH_TOKEN = process.env.REACT_APP_AUTH_TOKEN;
 
-export function getData() {
-  return axios.get(API_URL + '/data');
+export function getData() {
+  return axios.get(API_URL + '/data', {
+    headers: { Authorization: AUTH_TOKEN },
+  });
 }
"""

JS_FILE_CONTENT = """\
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const API_URL = process.env.REACT_APP_API_URL;
const AUTH_TOKEN = process.env.REACT_APP_AUTH_TOKEN;
const RETRY_LIMIT = 3;

export function getData() {
  return axios.get(API_URL + '/data', {
    headers: { Authorization: AUTH_TOKEN },
  });
}
"""

EMPTY_PATCH = ""

HUNK_ONLY_PATCH = """\
@@ -5,7 +5,7 @@
 def foo():
-    x = 1
+    x = 2
     return x
"""


# ---------------------------------------------------------------------------
# 1. _extract_modified_identifiers
# ---------------------------------------------------------------------------

class TestExtractModifiedIdentifiers:
    def test_extracts_from_added_lines(self):
        patch = "@@ -1,1 +1,2 @@\n import os\n+API_KEY = os.getenv('API_KEY')\n"
        ids = ASTContextPruner._extract_modified_identifiers(patch)
        # API_KEY is the important identifier — it's the name being defined
        assert "API_KEY" in ids
        # 'os' is 2 chars, above MIN_IDENT_LEN and not a stopword
        assert "os" in ids
        # 'getenv' is in STOPWORDS by design (prevents false-positive constant matches)
        assert "getenv" not in ids

    def test_extracts_from_removed_lines(self):
        patch = "@@ -1,2 +1,1 @@\n import os\n-SECRET = 'hardcoded'\n"
        ids = ASTContextPruner._extract_modified_identifiers(patch)
        assert "SECRET" in ids
        assert "hardcoded" in ids

    def test_ignores_context_lines(self):
        patch = "@@ -1,2 +1,2 @@\n context_identifier = True\n+new_line = 1\n"
        ids = ASTContextPruner._extract_modified_identifiers(patch)
        # context_identifier is on a context line (leading space) — must NOT be extracted
        assert "context_identifier" not in ids
        assert "new_line" in ids

    def test_filters_stopwords(self):
        patch = "@@ -1,1 +1,1 @@\n-if self.ok:\n+if self.ready:\n"
        ids = ASTContextPruner._extract_modified_identifiers(patch)
        # 'if', 'self', 'ok' (len 2) should be filtered
        assert "if" not in ids
        assert "self" not in ids

    def test_filters_short_identifiers(self):
        patch = "@@ -1,1 +1,1 @@\n-x = 1\n+y = 2\n"
        ids = ASTContextPruner._extract_modified_identifiers(patch)
        assert "x" not in ids
        assert "y" not in ids

    def test_returns_empty_for_context_only_patch(self):
        patch = "@@ -1,2 +1,2 @@\n line_one = 1\n line_two = 2\n"
        ids = ASTContextPruner._extract_modified_identifiers(patch)
        assert len(ids) == 0

    def test_real_python_patch(self):
        ids = ASTContextPruner._extract_modified_identifiers(PYTHON_PATCH)
        assert "API_KEY" in ids
        assert "requests" in ids
        assert "Authorization" in ids


# ---------------------------------------------------------------------------
# 2. _get_global_scope_lines
# ---------------------------------------------------------------------------

class TestGetGlobalScopeLines:
    def test_uses_file_content_when_provided(self):
        lines = ASTContextPruner._get_global_scope_lines(PYTHON_PATCH, PYTHON_FILE_CONTENT)
        # Should be the first GLOBAL_SCOPE_LINES lines of file_content
        expected = PYTHON_FILE_CONTENT.splitlines()[:GLOBAL_SCOPE_LINES]
        assert lines == expected

    def test_truncates_to_global_scope_lines(self):
        long_content = "\n".join(f"line_{i} = {i}" for i in range(200))
        lines = ASTContextPruner._get_global_scope_lines(PYTHON_PATCH, long_content)
        assert len(lines) == GLOBAL_SCOPE_LINES

    def test_returns_empty_when_no_file_content(self):
        """
        When file_content is not provided, the resolver must return []
        rather than attempting to reconstruct global scope from diff context.
        A unified diff only contains ±3 lines of surrounding context per hunk;
        global declarations at line 15 are absent when changes start at line 156.
        """
        lines = ASTContextPruner._get_global_scope_lines(PYTHON_PATCH, None)
        assert lines == []

    def test_returns_empty_list_for_empty_patch_and_no_content(self):
        lines = ASTContextPruner._get_global_scope_lines(HUNK_ONLY_PATCH, None)
        assert lines == []


# ---------------------------------------------------------------------------
# 3. _match_definitions
# ---------------------------------------------------------------------------

class TestMatchDefinitions:
    def test_matches_python_import(self):
        scope = ["import os", "import requests", "def main(): pass"]
        identifiers = {"requests", "os"}
        matched = ASTContextPruner._match_definitions(scope, identifiers)
        assert "import os" in matched
        assert "import requests" in matched

    def test_matches_python_constant(self):
        scope = ["API_KEY = os.getenv('API_KEY')", "x = 1", "def foo(): pass"]
        identifiers = {"API_KEY"}
        matched = ASTContextPruner._match_definitions(scope, identifiers)
        assert "API_KEY = os.getenv('API_KEY')" in matched

    def test_matches_js_import(self):
        scope = ["import axios from 'axios';", "const x = 1;", "function main() {}"]
        identifiers = {"axios"}
        matched = ASTContextPruner._match_definitions(scope, identifiers)
        assert "import axios from 'axios';" in matched

    def test_matches_js_process_env_constant(self):
        scope = ["const API_URL = process.env.REACT_APP_API_URL;"]
        identifiers = {"API_URL"}
        matched = ASTContextPruner._match_definitions(scope, identifiers)
        assert "const API_URL = process.env.REACT_APP_API_URL;" in matched

    def test_no_match_when_no_overlap(self):
        scope = ["import os", "API_KEY = os.getenv('X')"]
        identifiers = {"unrelated_identifier", "another_one"}
        matched = ASTContextPruner._match_definitions(scope, identifiers)
        assert matched == []

    def test_deduplicates_matched_lines(self):
        scope = ["import os", "import os", "import os"]
        identifiers = {"os"}
        matched = ASTContextPruner._match_definitions(scope, identifiers)
        assert matched.count("import os") == 1

    def test_does_not_match_non_definition_line(self):
        scope = ["print(API_KEY)", "logger.info(API_KEY)"]
        identifiers = {"API_KEY"}
        matched = ASTContextPruner._match_definitions(scope, identifiers)
        # Neither line is a definition pattern
        assert matched == []

    def test_preserves_original_order(self):
        scope = [
            "import os",
            "import logging",
            "API_KEY = os.getenv('API_KEY')",
        ]
        identifiers = {"os", "logging", "API_KEY"}
        matched = ASTContextPruner._match_definitions(scope, identifiers)
        assert matched.index("import os") < matched.index("import logging")
        assert matched.index("import logging") < matched.index("API_KEY = os.getenv('API_KEY')")


# ---------------------------------------------------------------------------
# 4. _format_resolved_block
# ---------------------------------------------------------------------------

class TestFormatResolvedBlock:
    def test_wraps_with_marker(self):
        lines = ["import os", "API_KEY = os.getenv('API_KEY')"]
        block = ASTContextPruner._format_resolved_block(lines)
        assert block.startswith(RESOLVED_DEPS_MARKER)
        assert block.endswith(RESOLVED_DEPS_MARKER)
        assert "import os" in block
        assert "API_KEY = os.getenv('API_KEY')" in block

    def test_newline_separated(self):
        lines = ["import os", "import sys"]
        block = ASTContextPruner._format_resolved_block(lines)
        assert "import os\nimport sys" in block


# ---------------------------------------------------------------------------
# 5. Full integration: prune_patch
# ---------------------------------------------------------------------------

class TestPrunePatch:
    def test_empty_patch_returns_empty(self):
        assert ASTContextPruner.prune_patch("") == ""

    def test_basic_hunk_pruning_without_file_content(self):
        result = ASTContextPruner.prune_patch(HUNK_ONLY_PATCH)
        assert result  # Non-empty
        assert "@@ -5,7 +5,7 @@" in result

    def test_resolved_deps_prepended_with_file_content_python(self):
        result = ASTContextPruner.prune_patch(PYTHON_PATCH, PYTHON_FILE_CONTENT)
        # Should have the marker block at the top
        assert result.startswith(RESOLVED_DEPS_MARKER)
        # Should still contain the diff hunk
        assert "@@" in result

    def test_resolved_deps_contain_matched_import(self):
        result = ASTContextPruner.prune_patch(PYTHON_PATCH, PYTHON_FILE_CONTENT)
        assert "import requests" in result
        assert "API_KEY" in result

    def test_resolved_deps_prepended_with_file_content_js(self):
        result = ASTContextPruner.prune_patch(JS_PATCH, JS_FILE_CONTENT)
        assert RESOLVED_DEPS_MARKER in result
        assert "import axios from 'axios';" in result

    def test_no_extra_marker_when_no_dependencies_resolved(self):
        """When the patch only touches lines with no matching global identifiers."""
        patch = "@@ -1,2 +1,2 @@\n-foo = 1\n+foo = 2\n"
        file_content = "import os\nAPI_KEY = os.getenv('X')\n"
        result = ASTContextPruner.prune_patch(patch, file_content)
        # "foo" doesn't appear in global definitions
        # So marker should NOT be present
        assert RESOLVED_DEPS_MARKER not in result

    def test_backward_compatible_without_file_content(self):
        """Calling with just raw_patch (original v1 signature) must not crash."""
        result = ASTContextPruner.prune_patch(PYTHON_PATCH)
        assert isinstance(result, str)
        assert len(result) > 0

    def test_hunk_context_trimmed_to_10_lines(self):
        """Unchanged lines beyond context_lines=10 should be hidden."""
        body_lines = [" unchanged"] * 30
        body_lines[15] = "+added_line = True"
        patch = "@@ -1,31 +1,31 @@\n" + "\n".join(body_lines)
        result = ASTContextPruner.prune_patch(patch, context_lines=10)
        assert "[... unmodified code hidden by Sentra ...]" in result
        assert "added_line" in result

    def test_graceful_fallback_on_corrupt_patch(self):
        """Completely malformed input should not raise."""
        result = ASTContextPruner.prune_patch("NOT A DIFF AT ALL\n\x00\xff")
        assert isinstance(result, str)

    def test_does_not_include_entire_file_content(self):
        """Token efficiency: the full file must NOT appear verbatim in output."""
        result = ASTContextPruner.prune_patch(PYTHON_PATCH, PYTHON_FILE_CONTENT)
        # TIMEOUT_SECONDS is defined in PYTHON_FILE_CONTENT but NOT referenced
        # in the modified diff lines — so it must NOT appear in the output
        assert "TIMEOUT_SECONDS" not in result

    def test_only_definitions_from_global_scope_included(self):
        """MAX_RETRIES = 3 is not a pattern we match (no os.environ, screaming snake)."""
        result = ASTContextPruner.prune_patch(PYTHON_PATCH, PYTHON_FILE_CONTENT)
        # MAX_RETRIES is not referenced by any modified line identifier
        assert "MAX_RETRIES" not in result

    def test_resolved_block_before_hunks(self):
        """The resolved block must appear BEFORE the diff hunks."""
        result = ASTContextPruner.prune_patch(PYTHON_PATCH, PYTHON_FILE_CONTENT)
        marker_pos = result.find(RESOLVED_DEPS_MARKER)
        hunk_pos = result.find("@@")
        assert marker_pos < hunk_pos, "Resolved block must precede diff hunks"
