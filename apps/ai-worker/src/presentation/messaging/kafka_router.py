import logging
import json
from confluent_kafka import Message
from src.application.use_cases.analyze_pr_use_case import AnalyzePRUseCase
from src.infrastructure.kafka.producer import KafkaProducer

logger = logging.getLogger(__name__)

class KafkaRouter:
    """
    Deserializes raw Kafka messages and routes them to the appropriate Application Use Case.
    Handles DLQ routing for poison pills and terminal failures.
    """
    def __init__(self, use_case: AnalyzePRUseCase, producer: KafkaProducer):
        self.use_case = use_case
        self.producer = producer
        self.max_retries = 3

    async def route(self, msg: Message):
        payload_bytes = msg.value()
        try:
            # Phase 5: Simplified JSON deserialization. (Normally Protobuf)
            payload = json.loads(payload_bytes.decode('utf-8'))
            logger.info(f"Routing PR event: action={payload.get('action')}")
            
            # Delegate to Application layer
            await self.use_case.execute(payload)
            
        except Exception as e:
            logger.error(f"Error processing message from {msg.topic()}: {e}")
            await self._handle_failure(msg, payload_bytes)
            # Re-raise to prevent manual offset commit if we didn't handle it cleanly
            # Wait, our handle_failure effectively 'handles' the error by routing it.
            # So we don't re-raise, allowing the consumer to commit this offset and move on.

    async def _handle_failure(self, msg: Message, payload_bytes: bytes):
        headers = msg.headers() or []
        retry_count = 0
        
        # Extract existing retry count
        for k, v in headers:
            if k == 'retry_count':
                retry_count = int(v.decode('utf-8'))

        if retry_count < self.max_retries:
            logger.warning(f"Routing event to retry topic. Attempt {retry_count + 1}")
            new_headers = [(k, v) for k, v in headers if k != 'retry_count']
            new_headers.append(('retry_count', str(retry_count + 1).encode('utf-8')))
            
            self.producer.publish(
                topic="sentra.pr.retry",
                key=msg.key(),
                value=payload_bytes,
                headers=new_headers
            )
        else:
            logger.error("Max retries reached. Routing poison pill to DLQ.")
            self.producer.publish(
                topic="sentra.pr.dlq",
                key=msg.key(),
                value=payload_bytes,
                headers=headers
            )
