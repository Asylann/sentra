"""Domain-level exceptions (business rule violations, not infra failures)."""


class DiffTooLargeError(Exception):
    """PR diff exceeds GitHub limits (>300 files or >100MB)."""


class TokenBudgetExceededError(Exception):
    """Context window budget exceeded even after all pruning stages."""


class InvalidWebhookPayloadError(Exception):
    """Protobuf deserialization of Kafka message failed."""


class SecretDetectedError(Exception):
    """High-entropy or regex-matched secret found in diff (immediate CRITICAL finding)."""

