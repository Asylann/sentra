"""
PRQueueConsumer — Presentation layer entry point.
Deserializes Protobuf PullRequestCreated event from Kafka message bytes.
Constructs PullRequest domain entity and delegates to AnalyzePullRequestUseCase.
Routes to PR_Queue_Retry on transient failures (exponential backoff).
Routes to PR_Queue_DLQ after max_retries exceeded (prevents pipeline blockage).
Research3 §"Queue Topology", Research1 §3.3.
"""

