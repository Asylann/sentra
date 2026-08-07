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
        self.model_id = "anthropic.claude-3-5-haiku-20241022-v1:0"
        
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
                "description": "Publish a list of security vulnerabilities, architectural flaws, and code quality issues found in the pull request.",
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
                                        "line_start": {"type": "integer"},
                                        "category": {"type": "string", "enum": ["Security", "Architecture", "Complexity", "Bug", "Style"]},
                                        "severity": {"type": "string", "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]},
                                        "title": {"type": "string", "description": "Short, descriptive title of the issue"},
                                        "description": {"type": "string", "description": "Detailed explanation of why this is an issue and how it violates policies"},
                                        "suggested_fix": {"type": "string", "description": "Markdown formatted code block showing the corrected code"}
                                    },
                                    "required": ["file_path", "line_start", "category", "severity", "title", "description", "suggested_fix"]
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
                "maxTokens": 4096,
                "temperature": 0.1 # Low temperature for analytical deterministic review
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
