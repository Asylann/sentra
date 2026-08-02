"""
LLMClientProtocol — Abstract port for LLM analysis.
Defined in the domain layer using typing.Protocol (structural subtyping).
The Application layer depends ONLY on this abstraction.
Concrete BedrockClaudeClient is injected at runtime; a mock is injected in tests.
This eliminates complex unittest.mock patches — just pass a different object.
Research1 §3.2: Dependency Inversion Principle via typing.Protocol.
"""
from typing import Protocol, runtime_checkable
from ..entities.pull_request import PullRequest
from ..entities.review_finding import ReviewFinding


@runtime_checkable
class LLMClientProtocol(Protocol):
    async def analyze_code(
        self,
        pull_request: PullRequest,
        diff_content: str,
        system_context: str,
    ) -> list[ReviewFinding]: ...

