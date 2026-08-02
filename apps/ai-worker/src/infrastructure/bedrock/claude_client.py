"""
BedrockClaudeClient — Implements LLMClientProtocol.
Research4 §"Structured Output" / Research2 §4.1:
  Uses Bedrock Converse API with Tool Use (Function Calling).
  Defines publish_code_review_findings tool with strict JSON Schema.
  Never uses "respond in JSON" prompts — they cause unpredictable parse failures.
Research1 §3.4 / Research2 §4.2 — Prompt Caching (SYSTEM_AND_TOOLS strategy):
  Static zone (cached): system instructions + tool definitions (top of request).
  Dynamic zone (uncached): git diff appended last (unique per call).
  Cache hit: 90% reduction in input token cost, 85% reduction in TTFT.
  Cache TTL: 5 minutes (extendable via repeated identical prefixes).
Model routing (Research2 §4.1):
  claude-3-haiku   → small PRs, config changes (fast, cheap)
  claude-3-5-sonnet → large algorithmic refactors (deep analysis)
temperature=0.0 for deterministic, reproducible reviews.
"""

