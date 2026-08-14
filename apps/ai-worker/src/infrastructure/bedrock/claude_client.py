"""
BedrockClaudeClient — Implements LLMClientProtocol.

Uses Bedrock Converse API with Tool Use (Function Calling).
Defines publish_code_review_findings tool with strict JSON Schema.
The tool schema now includes a `suggestion_code` field that instructs the model
to emit concrete replacement code suitable for GitHub's ```suggestion fence.

Prompt Caching (SYSTEM_AND_TOOLS strategy):
  Static zone (cached): system instructions + tool definitions.
  Dynamic zone (uncached): git diff appended last (unique per call).
"""
import logging
import re
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import List, Dict, Any

import boto3
from pydantic_settings import BaseSettings

from src.domain.entities.pull_request import PullRequest
from src.domain.entities.review_finding import ReviewFinding, Severity, Category

logger = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(max_workers=5)


class BedrockConfig(BaseSettings):
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    bedrock_model_id: str = "amazon.nova-pro-v1:0"

    class Config:
        env_file = ".env"
        extra = "ignore"


REVIEW_TOOL_SCHEMA = {
    "name": "publish_code_review_findings",
    "description": (
        "Publishes structured code review findings. For each issue found in the diff, "
        "provide a finding with file path, line range, category, severity, description, "
        "and — when the fix is unambiguous — the exact replacement code in `suggestion_code`. "
        "The suggestion_code field must contain ONLY the corrected line(s) that replace "
        "the original code at line_start through line_end. Do NOT include diff markers, "
        "fences, or surrounding unchanged lines.\n\n"
        "VALIDATION RULES:\n"
        "- suggestion_code MUST differ from the original code. Identical before/after = invalid.\n"
        "- Do NOT rename standard SQL columns (user_id, created_at, etc.).\n"
        "- If unsure about the fix, leave suggestion_code as empty string."
    ),
    "inputSchema": {
        "json": {
            "type": "object",
            "properties": {
                "thinking_process": {
                    "type": "string",
                    "description": (
                        "MANDATORY SCRATCHPAD — populate this BEFORE the findings array. "
                        "Step 1: Describe each changed file's role. "
                        "Step 2: For every potential issue, trace the concrete impact path: "
                        "  exact trigger, what fails, who is affected. "
                        "Step 3: Only assign HIGH or CRITICAL if the impact is direct, realistic, "
                        "  and results in a crash, data loss, or exploitable security breach. "
                        "Step 4: Demote speculative or edge-case findings to MEDIUM or LOW. "
                        "Minimum 3 sentences of genuine reasoning required."
                    ),
                },
                "findings": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "file_path": {
                                "type": "string",
                                "description": "Relative path of the affected file."
                            },
                            "line_start": {
                                "type": "integer",
                                "description": (
                                    "First affected line number in the NEW file (right-side / '+' lines in the diff). "
                                    "MUST reference a line that was ADDED or MODIFIED in this PR — NOT a context line."
                                )
                            },
                            "line_end": {
                                "type": "integer",
                                "description": (
                                    "Last affected line number in the new file. Same as line_start for single-line issues. "
                                    "For multi-line suggestions, this is the last line that will be REPLACED by suggestion_code."
                                )
                            },
                            "category": {
                                "type": "string",
                                "enum": ["Security", "Architecture", "Complexity", "Bug", "Style"]
                            },
                            "severity": {
                                "type": "string",
                                "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]
                            },
                            "title": {
                                "type": "string",
                                "description": "Short summary (under 80 chars)."
                            },
                            "description": {
                                "type": "string",
                                "description": "Detailed explanation of the issue and its impact."
                            },
                            "suggested_fix": {
                                "type": "string",
                                "description": "Human-readable explanation of how to fix the issue."
                            },
                            "suggestion_code": {
                                "type": "string",
                                "description": (
                                    "Exact replacement source code for the affected lines. "
                                    "This will be rendered inside a GitHub ```suggestion fence "
                                    "so the developer can click 'Apply suggestion' to auto-fix. "
                                    "IMPORTANT: You MUST populate this for ANY finding where the fix is a "
                                    "simple text replacement (typos, wrong paths, invalid ports, misspelled "
                                    "names, truncated strings, wrong image tags, missing characters). "
                                    "Only leave empty for complex refactors requiring multi-file changes. "
                                    "MUST be different from the original code."
                                )
                            }
                        },
                        "required": [
                            "file_path", "line_start", "line_end",
                            "category", "severity", "title",
                            "description", "suggested_fix", "suggestion_code"
                        ]
                    }
                }
            },
            "required": ["thinking_process", "findings"]
        }
    }
}

BASE_SYSTEM_PROMPT = (
    "You are Sentra, an expert AI code reviewer specializing in security analysis, "
    "code quality, and architectural review. Analyze the provided git diff and report "
    "findings using the publish_code_review_findings tool.\n\n"
    "IMPORTANT for suggestion_code:\n"
    "- When you can provide a concrete, unambiguous fix, populate suggestion_code with "
    "the exact replacement lines.\n"
    "- The suggestion_code replaces lines line_start through line_end in the new file.\n"
    "- Include ONLY the replacement code — no diff markers, no surrounding context.\n"
    "- For complex refactors or design-level issues, leave suggestion_code as empty string "
    "and explain the fix in suggested_fix instead.\n"
    "- Prioritize security findings (CRITICAL/HIGH) over style nits.\n\n"
    "ANTI-HALLUCINATION RULES (MANDATORY — violations invalidate the entire review):\n"
    "1. NEVER suggest a code fix where the suggestion_code is identical to the original code. "
    "If you cannot produce code that is DIFFERENT from what already exists, leave suggestion_code "
    "as an empty string. A no-op suggestion is worse than no suggestion.\n"
    "2. Do NOT hallucinate stylistic changes for standard database naming conventions. "
    "Column names like user_id, created_at, updated_at, org_id follow correct snake_case SQL "
    "convention — do NOT suggest renaming them to userid, createdat, orgid, etc.\n"
    "3. If you cannot confidently provide a syntactically correct and MEANINGFUL fix that "
    "actually changes the code, leave suggestion_code as empty string and explain the issue "
    "in suggested_fix text only.\n"
    "4. Before emitting any finding, verify that the original line you reference actually "
    "appears in the diff exactly as you quote it. Do NOT fabricate or hallucinate line content "
    "that does not exist in the provided <git_diff>.\n"
    "5. Do NOT emit duplicate findings for the same line with different wording.\n"
    "\nSEVERITY NEGATIVE CONSTRAINTS — read these before assigning any severity:\n"
    "- NEVER classify style issues, naming conventions, missing docstrings, or minor refactors as HIGH or CRITICAL.\n"
    "- Do NOT use HIGH unless the bug actively crashes the application, causes severe data loss, or introduces a confirmed security vulnerability with a direct, realistic exploit path.\n"
    "- If a finding requires an unlikely precondition chain or is described with words like \"could\", \"might\", or \"theoretically\", classify it MEDIUM or LOW.\n"
    "- Code that works correctly but is not idiomatic is NEVER HIGH or CRITICAL.\n"
    "- A missing error-check for a function that cannot realistically fail in context is LOW or INFO.\n"
)


# ── Semantic pruning ──────────────────────────────────────────────────────────
_LOW_VALUE_SUFFIXES = (
    "go.sum", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "pipfile.lock", "poetry.lock", "composer.lock", "gemfile.lock",
    "cargo.lock", ".min.js", ".min.css", ".pb.go", ".pb.gw.go",
    ".svg", ".woff", ".woff2", ".ttf", ".eot",
)
_LOW_VALUE_FRAGMENTS = (
    "_generated.", ".generated.", "generated_", "vendor/", "dist/",
    "node_modules/", "/__generated__/", "/.gen/",
)
_logger = logging.getLogger(__name__)


def _is_low_value_file(chunk: str) -> bool:
    lower = chunk.lower()
    return (
        any(lower.endswith(s) for s in _LOW_VALUE_SUFFIXES)
        or any(f in lower for f in _LOW_VALUE_FRAGMENTS)
    )


def _semantic_prune_diff(diff: str, max_chars: int = 60000) -> str:
    if len(diff) <= max_chars:
        return diff
    chunks = re.split(r"(?=^diff --git )", diff, flags=re.MULTILINE)
    if chunks and not chunks[0].strip():
        chunks = chunks[1:]
    high_value, low_value = [], []
    for c in chunks:
        (low_value if _is_low_value_file(c) else high_value).append(c)
    if low_value:
        _logger.info("Semantic pruning: dropped %d low-value file(s).", len(low_value))
    result = high_value[:]
    dropped = 0
    while result and len("".join(result)) > max_chars:
        result.pop()
        dropped += 1
    if dropped:
        _logger.warning(
            "Semantic pruning: dropped %d tail file(s) to fit %d-char limit. "
            "All included files are syntactically complete.",
            dropped, max_chars,
        )
    return "".join(result) if result else diff[:max_chars]


class BedrockClaudeClient:
    def __init__(self, config: BedrockConfig | None = None):
        self._config = config or BedrockConfig()
        self._client = boto3.client(
            "bedrock-runtime",
            region_name=self._config.aws_region,
            aws_access_key_id=self._config.aws_access_key_id,
            aws_secret_access_key=self._config.aws_secret_access_key,
        )

    async def analyze_code(
        self,
        pull_request: PullRequest,
        diff_content: str,
        system_context: str,
    ) -> List[ReviewFinding]:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            _executor,
            self._analyze_sync,
            pull_request,
            diff_content,
            system_context,
        )

    def _analyze_sync(
        self,
        pull_request: PullRequest,
        diff_content: str,
        system_context: str,
    ) -> List[ReviewFinding]:
        system_prompt = BASE_SYSTEM_PROMPT
        if system_context:
            system_prompt += f"\n\n{system_context}"

        truncated_diff = _semantic_prune_diff(diff_content)

        user_message = (
            f"Review the following pull request diff.\n"
            f"Repository: {pull_request.title}\n"
            f"Author: {pull_request.author_login}\n\n"
            f"<git_diff>\n{truncated_diff}\n</git_diff>"
        )

        try:
            response = self._client.converse(
                modelId=self._config.bedrock_model_id,
                system=[{"text": system_prompt}],
                messages=[{"role": "user", "content": [{"text": user_message}]}],
                toolConfig={
                    "tools": [{"toolSpec": REVIEW_TOOL_SCHEMA}],
                    "toolChoice": {"tool": {"name": "publish_code_review_findings"}},
                },
                inferenceConfig={"temperature": 0.1, "maxTokens": 4096},
            )
        except Exception as e:
            logger.error("Bedrock Converse API call failed: %s", e)
            return []

        return self._extract_findings(response)

    def _extract_findings(self, response: Dict[str, Any]) -> List[ReviewFinding]:
        findings: List[ReviewFinding] = []
        output = response.get("output", {})
        message = output.get("message", {})

        for block in message.get("content", []):
            if "toolUse" not in block:
                continue
            tool_input = block["toolUse"].get("input", {})
            raw_findings = tool_input.get("findings", [])

            for raw in raw_findings:
                try:
                    category = self._map_category(raw.get("category", "Style"))
                    severity = Severity(raw.get("severity", "INFO"))
                    findings.append(
                        ReviewFinding(
                            file_path=raw["file_path"],
                            line_start=raw.get("line_start", 1),
                            line_end=raw.get("line_end", raw.get("line_start", 1)),
                            category=category,
                            severity=severity,
                            title=raw.get("title", ""),
                            description=raw.get("description", ""),
                            suggested_fix=raw.get("suggested_fix", ""),
                            suggestion_code=raw.get("suggestion_code", ""),
                        )
                    )
                except (KeyError, ValueError) as e:
                    logger.warning("Skipping malformed finding: %s — %s", raw, e)

        return findings

    @staticmethod
    def _map_category(raw: str) -> Category:
        mapping = {
            "Security": Category.SECURITY,
            "Architecture": Category.ARCHITECTURE,
            "Complexity": Category.COMPLEXITY,
            "Bug": Category.SECURITY,
            "Style": Category.STYLE,
        }
        return mapping.get(raw, Category.STYLE)
