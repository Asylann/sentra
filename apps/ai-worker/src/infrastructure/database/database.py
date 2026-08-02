import os
import logging
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

logger = logging.getLogger(__name__)

# Fetch the URL, replacing standard postgresql with async driver
_raw_url = os.environ.get("POSTGRES_URL", "postgresql://sentra:sentra@localhost:5432/sentra")
if _raw_url.startswith("postgresql://"):
    _raw_url = _raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Create the async engine
engine = create_async_engine(
    _raw_url,
    echo=False,
    pool_size=10,
    max_overflow=20
)

# Create the session factory
AsyncSessionFactory = async_sessionmaker(
    bind=engine,
    expire_on_commit=False
)
