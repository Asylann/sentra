import json
import logging
from typing import Any, Dict
import redis.asyncio as redis

logger = logging.getLogger(__name__)

class RedisPublisher:
    """
    Publishes events to Redis Pub/Sub channels.
    Used for real-time frontend notifications via Go API Gateway.
    """
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self._pool = None
        self._client = None

    async def connect(self):
        """Initialize the Redis connection pool."""
        self._pool = redis.ConnectionPool.from_url(self.redis_url)
        self._client = redis.Redis.from_pool(self._pool)
        logger.info(f"RedisPublisher connected to {self.redis_url}")

    async def close(self):
        """Close the Redis connection pool."""
        if self._pool:
            await self._pool.disconnect()
            self._pool = None
            self._client = None
            logger.info("RedisPublisher disconnected")

    async def publish(self, channel: str, message: Dict[str, Any]):
        """
        Publish a JSON message to a specific Redis channel.
        """
        if not self._client:
            logger.warning("RedisPublisher not connected, skipping publish")
            return
            
        try:
            payload = json.dumps(message)
            await self._client.publish(channel, payload)
            logger.debug(f"Published to {channel}: {payload}")
        except Exception as e:
            logger.error(f"Failed to publish to Redis channel {channel}: {e}")
