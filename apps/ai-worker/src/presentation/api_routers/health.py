"""FastAPI health check endpoints."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/healthz", tags=["health"])
async def liveness() -> dict:
    """Liveness probe — process is running."""
    return {"status": "ok"}


@router.get("/readyz", tags=["health"])
async def readiness() -> dict:
    """Readiness probe — DB, Kafka, Redis are connected."""
    # TODO Phase 5: Check actual connection pools
    return {"status": "ok"}

