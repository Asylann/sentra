import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

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
        Wraps developer historical tendencies in strict <developer_profile> tags.
        """
        if not metrics:
            return "<developer_profile>\nNo historical data available.\n</developer_profile>"

        weaknesses = metrics.get("historical_weaknesses", [])
        weaknesses_str = ", ".join(weaknesses) if weaknesses else "None"
        prs = metrics.get("total_prs_analyzed", 0)

        return (
            "<developer_profile>\n"
            f"Developer Login: {metrics.get('login', 'unknown')}\n"
            f"Total PRs Analyzed: {prs}\n"
            f"Identified Weaknesses (Pay Close Attention): {weaknesses_str}\n"
            "</developer_profile>"
        )

    @classmethod
    def assemble_full_rag_context(cls, policies: List[str], developer_metrics: Dict[str, Any]) -> str:
        """
        Assembles the complete System Prompt RAG context block.
        """
        org_xml = cls.build_organization_rules_xml(policies)
        dev_xml = cls.build_developer_profile_xml(developer_metrics)

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
            "</suggested_fix_format>\n"
            "</severity_definitions>"
        )

        return f"{severity_guide}\n\n{org_xml}\n\n{dev_xml}"
