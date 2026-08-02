import logging
from confluent_kafka import Producer

logger = logging.getLogger(__name__)

class KafkaProducer:
    """
    Basic Kafka Producer for routing failed events to retry topics or the DLQ.
    """
    def __init__(self, brokers: str):
        self.producer = Producer({
            'bootstrap.servers': brokers,
            'enable.idempotence': True,
            'acks': 'all'
        })

    def publish(self, topic: str, key: bytes, value: bytes, headers: list = None):
        try:
            self.producer.produce(
                topic=topic,
                key=key,
                value=value,
                headers=headers,
                on_delivery=self._delivery_report
            )
            self.producer.poll(0)
        except Exception as e:
            logger.error(f"Failed to enqueue message to {topic}: {e}")

    def _delivery_report(self, err, msg):
        if err is not None:
            logger.error(f"Message delivery failed: {err}")
        else:
            logger.debug(f"Message delivered to {msg.topic()} [{msg.partition()}]")

    def flush(self):
        self.producer.flush()
