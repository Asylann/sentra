import asyncio
import logging
import threading
from confluent_kafka import Consumer, KafkaError, TopicPartition
from src.presentation.messaging.kafka_router import KafkaRouter

logger = logging.getLogger(__name__)

class PRQueueConsumer:
    """
    Robust background consumer implementing the Async Delegation Pattern.
    Prevents max.poll.interval.ms timeouts during long LLM inference by 
    decoupling the poll loop from the processing coroutines.
    """
    def __init__(self, brokers: str, group_id: str, router: KafkaRouter):
        self.consumer = Consumer({
            'bootstrap.servers': brokers,
            'group.id': group_id,
            'enable.auto.commit': False,
            'max.poll.interval.ms': 600000, # 10 mins (allows for Claude 3 latency + retries)
            'auto.offset.reset': 'earliest'
        })
        self.router = router
        self._running = False
        self._commit_queue = []
        self._lock = threading.Lock()

    def start_in_background(self, topic: str):
        self.consumer.subscribe([topic])
        self._running = True
        self._thread = threading.Thread(target=self._poll_loop, daemon=True)
        self._thread.start()
        logger.info(f"Kafka consumer started on topic {topic}")

    def _poll_loop(self):
        try:
            main_loop = asyncio.get_running_loop()
        except RuntimeError:
            # Fallback if no loop is running in the current thread (it shouldn't be, we are in a new thread)
            # Actually, we need to pass the loop from the main thread.
            pass
            
        logger.error("Must run within an active asyncio loop context to grab the running loop.")
        return

    # Let's fix the loop passing:
    def start_in_background_with_loop(self, topic: str, loop: asyncio.AbstractEventLoop):
        self.consumer.subscribe([topic])
        self._running = True
        self._thread = threading.Thread(target=self._poll_loop_safe, args=(loop,), daemon=True)
        self._thread.start()
        logger.info(f"Kafka consumer started on topic {topic}")

    def _poll_loop_safe(self, main_loop: asyncio.AbstractEventLoop):
        while self._running:
            # 1. Commit any successfully processed offsets
            with self._lock:
                if self._commit_queue:
                    try:
                        self.consumer.commit(offsets=self._commit_queue, asynchronous=False)
                        self._commit_queue.clear()
                    except Exception as e:
                        logger.error(f"Manual commit failed: {e}")

            # 2. Maintain heartbeat and poll for new messages
            msg = self.consumer.poll(1.0)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() != KafkaError._PARTITION_EOF:
                    logger.error(f"Kafka error: {msg.error()}")
                continue

            # 3. Backpressure: pause partition to prevent pulling more messages
            # until this specific message is fully processed. Ensures ordering per-partition.
            tp = TopicPartition(msg.topic(), msg.partition())
            self.consumer.pause([tp])

            # 4. Delegate to async task
            asyncio.run_coroutine_threadsafe(self._process_msg(msg, tp), main_loop)

    async def _process_msg(self, msg, tp: TopicPartition):
        try:
            await self.router.route(msg)
        except Exception as e:
            logger.error(f"Failed to route/process message: {e}")
        finally:
            # Mark offset for commit (the next offset to fetch)
            tp.offset = msg.offset() + 1
            with self._lock:
                self._commit_queue.append(tp)
            # Resume partition to pull the next message
            self.consumer.resume([tp])

    def stop(self):
        self._running = False
        if hasattr(self, '_thread'):
            self._thread.join(timeout=5.0)
        self.consumer.close()
        logger.info("Kafka consumer stopped gracefully")
