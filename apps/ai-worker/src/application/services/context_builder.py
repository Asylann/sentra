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
        
        return f"{org_xml}\n\n{dev_xml}"
