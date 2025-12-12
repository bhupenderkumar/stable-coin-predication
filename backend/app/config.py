"""
Configuration module for the trading bot backend.
Loads environment variables and provides typed configuration.
"""

import os
from typing import Optional
from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App Settings
    app_name: str = "Solana Meme Coin Trading Bot"
    debug: bool = Field(default=True, alias="DEBUG")
    env: str = Field(default="development", alias="ENV")
    
    # API Keys
    groq_api_key: Optional[str] = Field(default=None, alias="GROQ_API_KEY")
    birdeye_api_key: Optional[str] = Field(default=None, alias="BIRDEYE_API_KEY")
    
    # External API URLs
    binance_api_url: str = Field(
        default="https://api.binance.com/api/v3",
        alias="BINANCE_API_URL"
    )
    jupiter_api_url: str = Field(
        default="https://quote-api.jup.ag/v6",
        alias="JUPITER_API_URL"
    )
    birdeye_api_url: str = Field(
        default="https://public-api.birdeye.so",
        alias="BIRDEYE_API_URL"
    )
    
    # Solana Configuration
    solana_rpc_url: str = Field(
        default="https://api.devnet.solana.com",
        alias="SOLANA_RPC_URL"
    )
    
    # Database
    database_url: str = Field(
        default="sqlite:///./data/trading.db",
        alias="DATABASE_URL"
    )
    
    # Redis Cache
    redis_url: str = Field(
        default="redis://localhost:6379",
        alias="REDIS_URL"
    )
    cache_ttl_seconds: int = Field(default=60, alias="CACHE_TTL_SECONDS")
    
    # Rate Limiting
    rate_limit_requests: int = Field(default=100, alias="RATE_LIMIT_REQUESTS")
    rate_limit_period: int = Field(default=60, alias="RATE_LIMIT_PERIOD")
    
    # Trading Parameters
    min_liquidity: float = 50000  # $50k minimum
    max_position_size: float = 100  # Max $100 per trade
    confidence_threshold: int = 70  # Only trade if AI > 70% confident
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Convenience function for direct access
settings = get_settings()
