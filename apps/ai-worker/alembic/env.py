"""
Alembic environment configuration.
Python owns ALL database migrations. Research1 §2.2.

This env.py uses asyncio + asyncpg for SQLAlchemy 2.0 async engine.
The trick: async_engine_from_config must be run inside asyncio.run()
to avoid the MissingGreenlet error that occurs when async I/O is
attempted outside an event loop.
"""
from alembic import context
import sys
import os
import asyncio

# Add src to Python path so we can import models
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.infrastructure.database.models import Base
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

config = context.config


def _get_db_url() -> str:
    """
    Returns the database URL, preferring the POSTGRES_URL environment variable.
    Rewrites the scheme to postgresql+asyncpg:// for the async driver.
    """
    url = os.environ.get("POSTGRES_URL", "")
    if not url:
        url = config.get_main_option("sqlalchemy.url", "")
    # Ensure we always use the asyncpg driver
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (no DB connection, generates SQL)."""
    url = _get_db_url()
    context.configure(
        url=url,
        target_metadata=Base.metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    """Callback executed synchronously inside the async connection context."""
    context.configure(
        connection=connection,
        target_metadata=Base.metadata,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Async entry point: create engine, connect, run migrations."""
    url = _get_db_url()
    if not url:
        raise RuntimeError(
            "No database URL configured. Set POSTGRES_URL environment variable."
        )

    # Build a minimal config dict for async_engine_from_config
    configuration = {"sqlalchemy.url": url}

    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode.
    Wraps the async migration runner in asyncio.run() to avoid the
    MissingGreenlet error that occurs when async I/O is attempted
    outside an active event loop.
    """
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
