"""
Test configuration and fixtures.
"""

import pytest
import asyncio
from typing import Generator, AsyncGenerator

from fastapi.testclient import TestClient
from httpx import AsyncClient

from app.main import app
from app.database import Base, engine


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def client() -> Generator:
    """Create test client for synchronous tests."""
    with TestClient(app) as c:
        yield c


@pytest.fixture
async def async_client() -> AsyncGenerator:
    """Create async test client."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture(autouse=True)
def setup_database():
    """Setup and teardown database for each test."""
    # Create tables
    Base.metadata.create_all(bind=engine)
    yield
    # Drop tables after test
    Base.metadata.drop_all(bind=engine)
