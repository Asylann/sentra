import time
import logging
import asyncio
from typing import List, Dict, Any
from concurrent.futures import ThreadPoolExecutor

import boto3
from botocore.config import Config
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)

class BedrockConfig(BaseSettings):
    """Loaded via pydantic-settings from .env for AWS credentials"""
    aws_access_key_id: str = __import__("os").environ.get("AWS_BEDROCK_ACCESS_KEY", "")
    aws_secret_access_key: str = __import__("os").environ.get("AWS_BEDROCK_SECRET_ACCESS_KEY", "")
    aws_region: str = __import__("os").environ.get("AWS_DEFAULT_REGION", "us-east-1")
    
    class Config:
        env_file = ".env"
        extra = "ignore"

class BedrockClaudeClient:
    """
    AWS Bedrock integration utilizing Claude 3.5 Sonnet via the Converse API.
    Enforces structured JSON outputs using Tool Use (Function Calling).
    """
    def __init__(self):
        aws_access_key_id = __import__("os").environ.get("AWS_BEDROCK_ACCESS_KEY", "")
        aws_secret_access_key = __import__("os").environ.get("AWS_BEDROCK_SECRET_ACCESS_KEY", "")
        aws_region = __import__("os").environ.get("AWS_DEFAULT_REGION", "us-east-1")
        
        # Configure strict retries and long timeouts for complex code inference
        boto_config = Config(
            region_name=aws_region,
            retries={"max_attempts": 3, "mode": "standard"},
            read_timeout=90,
            connect_timeout=10
        )
        
        # We pass credentials explicitly here, but in production, IAM Roles (EC2/EKS) are preferred
        client_kwargs = {"config": boto_config}
        if aws_access_key_id and aws_secret_access_key:
            client_kwargs["aws_access_key_id"] = aws_access_key_id
            client_kwargs["aws_secret_access_key"] = aws_secret_access_key
            
        self.client = boto3.client("bedrock-runtime", **client_kwargs)
        self.model_id = "us.anthropic.claude-sonnet-4-5"
        
        # ThreadPool for isolating blocking boto3 calls from the asyncio loop
        self._executor = ThreadPoolExecutor(max_workers=5)

    async def analyze_diff(self, system_prompt: str, pruned_diff: str) -> List[Dict[str, Any]]:
        """
        Sends the isolated diff and RAG context to Claude 3.5 Sonnet.
        Forces the LLM to invoke the 'publish_code_review_findings' tool to guarantee JSON schema.
        """
        tool_definition = {
            "toolSpec": {
                "name": "publish_code_review_findings",
                "description": (
                    "Perform a strict, senior-engineer-level security and quality review of this diff. "
                    "Your job is to find REAL bugs, security issues, and infrastructure errors — NOT to "
                    "summarize what the code does.\n\n"
                    "SEVERITY RULES (strictly enforced):\n"
                    "- CRITICAL: Exploitable vulnerability (hardcoded secret, SQLi, RCE, auth bypass). RARE.\n"
                    "- HIGH: Security weakness or infra failure that blocks deployment or causes data loss.\n"
                    "- MEDIUM: Functional error in executable/infra files — broken paths, wrong ports, "
                    "invalid commands, missing required config. If it breaks the build or runtime, it is MEDIUM.\n"
                    "- LOW: Code quality issue with no runtime impact.\n"
                    "- INFO: ONLY for typos in README/.md documentation files. "
                    "NEVER use INFO for errors in Go/Python/JS/TS source code, Dockerfiles, YAML, shell scripts, "
                    "or any file that gets executed or interpreted. If you find a real bug in source code, "
                    "it must be LOW, MEDIUM, HIGH, or CRITICAL — never INFO.\n\n"
                    "WHAT TO LOOK FOR (examples):\n"
                    "- Hardcoded secrets, tokens, passwords → CRITICAL\n"
                    "- Missing input validation, SQL injection vectors → HIGH\n"
                    "- Race conditions, nil pointer dereferences, unchecked errors → MEDIUM/HIGH\n"
                    "- Incorrect error handling patterns, ignored return values → MEDIUM\n"
                    "- Performance issues (N+1 queries, unbounded loops) → MEDIUM/LOW\n"
                    "- Insecure defaults (no timeouts, overly broad CORS) → MEDIUM\n"
                    "- Dead code, unnecessary complexity → LOW\n\n"
                    "ANTI-HALLUCINATION RULES (MANDATORY):\n"
                    "1. Never emit a finding that just describes what the code does — only report actual problems.\n"
                    "2. Never suggest a fix where the suggested code is identical to the original.\n"
                    "3. Never suggest renaming standard SQL columns (user_id, created_at, etc.).\n"
                    "4. Only reference lines that actually appear in the diff as '+' (added) lines.\n"
                    "5. If you cannot provide a meaningfully different fix, leave suggested_fix as empty string."
                ),
                "inputSchema": {
                    "json": {
                        "type": "object",
                        "properties": {
                            "findings": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "file_path": {"type": "string"},
                                        "line_start": {
                                            "type": "integer",
                                            "description": (
                                                "Line number in the NEW file (right-side / '+' lines in the diff). "
                                                "MUST reference a line that was actually ADDED or MODIFIED in this PR. "
                                                "Context lines (lines starting with space in the diff) are NOT valid targets."
                                            )
                                        },
                                        "line_end": {
                                            "type": "integer",
                                            "description": (
                                                "Last affected line number in the new file. Same as line_start for "
                                                "single-line issues. For multi-line suggestions, this is the last line "
                                                "that will be REPLACED by suggestion_code."
                                            )
                                        },
                                        "category": {"type": "string", "enum": ["Security", "Architecture", "Infrastructure", "Bug", "Style"]},
                                        "severity": {
                                            "type": "string",
                                            "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"],
                                            "description": (
                                                "CRITICAL=exploitable security vuln; "
                                                "HIGH=security weakness or infra failure blocking deployment; "
                                                "MEDIUM=functional breakage in executable/infra files (wrong paths, invalid ports, broken commands, misconfigured compose services); "
                                                "LOW=code quality issue with no runtime impact; "
                                                "INFO=cosmetic only in documentation files (typos in README/LICENSE/md). "
                                                "NEVER use INFO for errors in Dockerfile, docker-compose, YAML pipelines, shell scripts, or nginx configs."
                                            )
                                        },
                                        "title": {"type": "string", "description": "Short, descriptive title of the issue"},
                                        "description": {"type": "string", "description": "Explain concretely what breaks: which command fails, which port is invalid, which path does not exist, what the runtime consequence is"},
                                        "suggested_fix": {
                                            "type": "string",
                                            "description": (
                                                "A unified diff patch showing ONLY the changed lines. "
                                                "Format exactly like this — no code fences, no markdown, plain text only:\n"
                                                "-old line as it appears in the file\n"
                                                "+new corrected line\n"
                                                "Rules: the '-' line must be copied EXACTLY from the file (same spacing, same characters). "
                                                "The '+' line must show the corrected version. "
                                                "CRITICAL: Do NOT output identical text on both '-' and '+' lines — "
                                                "if you cannot produce a DIFFERENT '+' line, leave this field as empty string. "
                                                "Do NOT wrap in triple backticks. "
                                                "Do NOT invent lines that do not exist in the diff. "
                                                "Do NOT rename standard SQL column names (user_id, created_at, etc). "
                                                "Example for a typo fix: -FROM nginx:1.25-alp\\n+FROM nginx:1.25-alpine"
                                            )
                                        },
                                        "suggestion_code": {
                                            "type": "string",
                                            "description": (
                                                "Exact replacement source code for the affected line(s). "
                                                "This is rendered inside a GitHub ```suggestion fence for one-click apply. "
                                                "IMPORTANT: You MUST populate this field for ANY finding where the fix is a "
                                                "simple text replacement (typos, wrong paths, invalid ports, misspelled names, "
                                                "truncated strings, wrong image tags). These are unambiguous single-line fixes. "
                                                "Only leave empty for complex refactors or design-level issues that require "
                                                "multi-file changes. The suggestion_code must be DIFFERENT from the original. "
                                                "Include ONLY the replacement text — no diff markers, no fences, no context lines."
                                            )
                                        }
                                    },
                                    "required": ["file_path", "line_start", "line_end", "category", "severity", "title", "description", "suggested_fix", "suggestion_code"]
                                }
                            }
                        },
                        "required": ["findings"]
                    }
                }
            }
        }

        # Safeguard against massive diffs exceeding LLM input token limits
        # Approx 60,000 characters is safely within typical 16k-32k token limits
        max_chars = 60000
        if len(pruned_diff) > max_chars:
            logger.warning(f"Diff size ({len(pruned_diff)} chars) exceeds {max_chars}, truncating.")
            pruned_diff = pruned_diff[:max_chars] + "\n\n... [DIFF TRUNCATED DUE TO SIZE LIMIT] ..."

        user_message = {
            "role": "user",
            # XML tags to cleanly isolate the diff from prompt injection attacks
            "content": [{"text": f"<git_diff>\n{pruned_diff}\n</git_diff>"}]
        }

        request_kwargs = {
            "modelId": self.model_id,
            "messages": [user_message],
            "system": [{"text": system_prompt}],
            "toolConfig": {
                "tools": [tool_definition],
                "toolChoice": {
                    "tool": {"name": "publish_code_review_findings"}
                }
            },
            "inferenceConfig": {
                "maxTokens": 8192,
                "temperature": 0.1,  # Low temperature for analytical deterministic review
            }
        }

        logger.info(f"Invoking Bedrock Converse API ({self.model_id})...")
        start_time = time.time()
        
        # Execute blocking boto3 call in the threadpool
        loop = asyncio.get_running_loop()
        try:
            response = await loop.run_in_executor(
                self._executor, 
                lambda: self.client.converse(**request_kwargs)
            )
            
            inference_time = time.time() - start_time
            
            # Log rich metrics
            usage = response.get('usage', {})
            input_tokens = usage.get('inputTokens', 0)
            output_tokens = usage.get('outputTokens', 0)
            logger.info(f"Bedrock Inference completed in {inference_time:.2f}s (In: {input_tokens} | Out: {output_tokens})")

            return self._extract_tool_findings(response)
        except Exception as e:
            logger.error(f"AWS Bedrock Inference failed: {e}")
            raise

    def _extract_tool_findings(self, response: dict) -> List[Dict[str, Any]]:
        """Parses the Bedrock Converse API response for tool use arguments."""
        try:
            output_message = response['output']['message']
            for content_block in output_message.get('content', []):
                if 'toolUse' in content_block:
                    tool_use = content_block['toolUse']
                    if tool_use['name'] == 'publish_code_review_findings':
                        return tool_use['input'].get('findings', [])
        except KeyError as e:
            logger.error(f"Unexpected Bedrock response structure: {e}")
            
        return []
