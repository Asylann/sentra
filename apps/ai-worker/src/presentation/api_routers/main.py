"""FastAPI application factory."""
from fastapi import FastAPI
from .health import router as health_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="Sentra AI Worker",
        version="0.1.0",
        description="LLM-powered code review engine for the Sentra platform.",
    )
    app.include_router(health_router)
    return app

app = create_app()

