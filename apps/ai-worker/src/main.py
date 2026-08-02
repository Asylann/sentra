import os
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI

from src.application.use_cases.analyze_pr_use_case import AnalyzePRUseCase
from src.infrastructure.kafka.producer import KafkaProducer
from src.presentation.messaging.kafka_router import KafkaRouter
from src.infrastructure.kafka.consumer import PRQueueConsumer

from src.infrastructure.github.auth import GitHubAppAuth
from src.infrastructure.github.client import GitHubClient
from src.infrastructure.github.check_runs import GitHubCheckRunsAPI
from src.infrastructure.database.rag_repository import RAGRepository
from src.infrastructure.llm.bedrock_client import BedrockClaudeClient
from src.infrastructure.redis.redis_publisher import RedisPublisher

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)

# Global instances for graceful teardown
producer = None
consumer = None
redis_publisher = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global producer, consumer
    logger.info("Starting up Sentra AI Worker...")

    brokers = os.environ.get("KAFKA_BROKERS", "localhost:9094")
    github_app_id = os.environ.get("GITHUB_APP_ID", "dummy_app_id")
    github_private_key = os.environ.get("GITHUB_APP_PRIVATE_KEY", "dummy_dev_token")
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    
    # 1. Initialize Dependencies (Clean Architecture Wiring)
    producer = KafkaProducer(brokers=brokers)
    
    global redis_publisher
    redis_publisher = RedisPublisher(redis_url=redis_url)
    await redis_publisher.connect()
    
    github_auth = GitHubAppAuth(app_id=github_app_id, private_key=github_private_key)
    github_client = GitHubClient(auth=github_auth)
    check_runs_api = GitHubCheckRunsAPI(auth=github_auth)
    rag_repo = RAGRepository() # Session injection mocked for now
    bedrock_client = BedrockClaudeClient()
    
    from src.infrastructure.database.database import AsyncSessionFactory
    
    use_case = AnalyzePRUseCase(
        github_client=github_client,
        check_runs_api=check_runs_api,
        rag_repo=rag_repo,
        bedrock_client=bedrock_client,
        redis_publisher=redis_publisher,
        db_session_factory=AsyncSessionFactory
    )
    
    router = KafkaRouter(use_case=use_case, producer=producer)
    
    consumer = PRQueueConsumer(
        brokers=brokers,
        group_id="sentra-ai-worker-group",
        router=router
    )

    # 2. Start Kafka consumer in background thread, passing the active asyncio loop
    loop = asyncio.get_running_loop()
    consumer.start_in_background_with_loop(topic="sentra.pr.queue", loop=loop)

    yield # App runs here

    # 3. Teardown
    logger.info("Shutting down Sentra AI Worker...")
    if consumer:
        consumer.stop()
    if producer:
        producer.flush()
    if redis_publisher:
        await redis_publisher.close()

# Initialize FastAPI app
app = FastAPI(
    title="Sentra AI Worker",
    description="LLM-powered code review worker",
    version="0.1.0",
    lifespan=lifespan
)

@app.get("/healthz")
async def healthz():
    return {"status": "ok", "service": "ai-worker"}
