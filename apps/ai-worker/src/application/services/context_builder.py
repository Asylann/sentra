import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Maps user-facing focus names (from Settings UI) to the categories the LLM understands
FOCUS_CATEGORY_MAP = {
    "Security Vulnerabilities": "Security",
    "Performance/Big-O":        "Performance",
    "Code Style/Formatting":    "Style",
    "Documentation Check":      "Documentation",
    # Internal categories (direct matches)
    "Security":       "Security",
    "Complexity":     "Complexity",
    "Architecture":   "Architecture",
    "Style":          "Style",
    "Performance":    "Performance",
}


class RAGContextBuilder:
    """
    Formats retrieved RAG data strictly into XML tags for Claude 3.
    This explicit structure acts as a defense mechanism against prompt injection
    and ensures the LLM strongly isolates instructions from the untrusted code diff.
    """

    @classmethod
    def build_organization_rules_xml(cls, policies: List[str]) -> str:
        """
        Wraps repository policies in strict <organization_rules> tags.
        """
        if not policies:
            return "<organization_rules>\nNo specific rules found.\n</organization_rules>"

        rules_str = "\n".join(f"- {rule}" for rule in policies)
        return f"<organization_rules>\n{rules_str}\n</organization_rules>"

    @classmethod
    def build_developer_profile_xml(cls, metrics: Dict[str, Any]) -> str:
        """
        Formerly wrapped developer historical tendencies in <developer_profile> tags.
        Removed to eliminate developer-profile bias in severity classification.
        """
        return ""

    @classmethod
    def build_analysis_focus_xml(cls, analysis_focus: List[str]) -> str:
        """
        Builds an <analysis_focus> XML block instructing the LLM which categories
        the organization has configured as priorities. Categories NOT in this list
        should still be reported if critical, but the LLM should deprioritize them.
        """
        if not analysis_focus:
            return ""  # No focus restriction — analyze everything equally

        # Normalize category names
        normalized = []
        for f in analysis_focus:
            mapped = FOCUS_CATEGORY_MAP.get(f, f)
            if mapped not in normalized:
                normalized.append(mapped)

        focus_str = ", ".join(normalized)
        return (
            "<analysis_focus>\n"
            f"The organization has configured the following analysis priorities: {focus_str}.\n"
            "Focus your analysis effort on these categories. For each category in this list:\n"
            + "\n".join(f"  - {cat}: Look especially carefully for issues in this area." for cat in normalized)
            + "\n"
            "You may still report issues from other categories if they are CRITICAL or HIGH severity, "
            "but do not generate LOW or INFO findings for categories not listed above.\n"
            "</analysis_focus>"
        )

    @classmethod
    def assemble_full_rag_context(
        cls,
        policies: List[str],
        developer_metrics: Dict[str, Any],
        analysis_focus: List[str] | None = None,
    ) -> str:
        """
        Assembles the complete System Prompt RAG context block.

        Args:
            policies:          Custom organization rules to inject.
            developer_metrics: Developer history for personalized review.
            analysis_focus:    Categories the org wants the AI to focus on (from Settings UI).
        """
        org_xml = cls.build_organization_rules_xml(policies)
        focus_xml = cls.build_analysis_focus_xml(analysis_focus or [])

        severity_guide = (
            "<severity_definitions>\n"
            "Use the following strict definitions when assigning severity. Think carefully before assigning a level.\n\n"
            "- CRITICAL: Exploitable security vulnerability with direct impact (RCE, SQLi, auth bypass, hardcoded secret "
            "with active scope, exposed credentials). Assign this rarely — only when there is a clear, direct attack vector.\n\n"
            "- HIGH: Security weakness or critical infrastructure failure that blocks deployment or causes data loss "
            "(e.g. missing auth check, SSRF, path traversal, a broken Dockerfile base image that prevents ANY build, "
            "a misconfigured reverse proxy that exposes internal services).\n\n"
            "- MEDIUM: Functional breakage with no security impact. This includes:\n"
            "  * A truncated or misspelled file path in a Dockerfile COPY/RUN command that makes the build fail\n"
            "  * An invalid/truncated port in EXPOSE (e.g. '44km3' instead of '443') that breaks the image\n"
            "  * A broken shell command in CI/CD YAML or Makefile that silently skips a required step\n"
            "  * A wrong config key/path in docker-compose that causes a container to start in a broken state\n"
            "  * A race condition, unchecked error causing data loss, or unsafe dependency\n"
            "  * Any change to an executable/infrastructure file (Dockerfile, docker-compose, .sh, YAML pipeline) "
            "where the introduced error would cause build failure, deployment failure, or silent misconfiguration.\n\n"
            "- LOW: Minor code quality issue with no runtime impact (unclear variable name, missing edge-case "
            "handling, redundant code, slightly wrong comment describing logic).\n\n"
            "- INFO: Purely cosmetic changes with absolutely zero functional or build impact:\n"
            "  * Typos in README, LICENSE, or other documentation-only files\n"
            "  * Whitespace, blank lines, formatting in docs\n"
            "  * Outdated comments, stale TODOs in non-executable files\n"
            "  * Broken hyperlinks in documentation\n\n"
            "CRITICAL RULE: Do NOT assign INFO to errors in executable or infrastructure files "
            "(Dockerfile, docker-compose*.yml, .github/workflows/, Makefile, shell scripts, nginx.conf). "
            "Even if the change looks like a typo, if it appears in a file that is interpreted/executed, "
            "assess whether it would break the build or runtime — if yes, it is MEDIUM at minimum.\n"
            "CRITICAL RULE: Do NOT assign INFO to the same finding type just because it appears multiple times. "
            "Each Dockerfile instruction error is a separate MEDIUM finding.\n\n"
            "<suggested_fix_format>\n"
            "The suggested_fix field MUST be a plain unified diff — no markdown fences, no backticks, plain text only.\n"
            "Format:\n"
            "-<exact original line copied from the file>\n"
            "+<corrected line>\n"
            "CRITICAL: The '-' line must be copied EXACTLY from the file. "
            "Do NOT write the same text on both '-' and '+' lines. "
            "If the fix is to delete a line entirely, use '-<line>' with no '+' line. "
            "If the fix is to insert a line, use '+<line>' with no '-' line.\n"
            "</suggested_fix_format>\n\n"
            "<line_targeting_rules>\n"
            "CRITICAL: line_start and line_end MUST reference lines that are ADDED or MODIFIED "
            "in this PR diff (lines starting with '+' in the unified diff). These are the 'new file' "
            "line numbers shown after the @@ hunk header (e.g., @@ -10,5 +12,7 @@ means new file "
            "starts at line 12).\n"
            "- NEVER target a context line (lines starting with space in the diff) — GitHub rejects "
            "suggestions on unchanged lines with 'no changes were made to the code'.\n"
            "- The suggestion_code MUST be DIFFERENT from what currently exists on the targeted "
            "line(s). An identical suggestion is invalid and will be rejected.\n"
            "- If you cannot identify the exact new-file line number for a finding, leave "
            "suggestion_code as empty string and describe the fix in suggested_fix text instead.\n"
            "</line_targeting_rules>\n\n"
            "<negative_severity_constraints>\n"
            "NEGATIVE CONSTRAINT: NEVER classify style issues, naming conventions, missing docstrings, or minor refactors as HIGH or CRITICAL. These are always MEDIUM, LOW, or INFO.\n"
            "NEGATIVE CONSTRAINT: Do NOT use HIGH or CRITICAL unless the finding actively crashes the application, causes severe data loss, introduces a confirmed security vulnerability, or causes an unambiguous logic failure with a concrete impact path. Theoretical or \"could potentially\" issues do not qualify.\n"
            "NEGATIVE CONSTRAINT: If a finding is purely theoretical, requires an unlikely chain of preconditions, or is an edge-case with no realistic trigger in this codebase, it MUST be classified MEDIUM or LOW.\n"
            "NEGATIVE CONSTRAINT: Code that works correctly but could be written more idiomatically is NEVER HIGH or CRITICAL. Prefer not filing it at all unless it is genuinely confusing.\n"
            "NEGATIVE CONSTRAINT: A missing error check for a function that cannot reasonably fail in context is LOW or INFO, not HIGH.\n"
            "</negative_severity_constraints>\n"
            "</severity_definitions>"
        )

        parts = [severity_guide, org_xml]
        if focus_xml:
            parts.append(focus_xml)

        return "\n\n".join(parts)
