"""
Token-related Pydantic schemas for API request/response validation.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class TokenBase(BaseModel):
    """Base token schema."""
    symbol: str
    name: Optional[str] = None
    mintAddress: Optional[str] = None


class TokenResponse(BaseModel):
    """Single token response with full data."""
    symbol: str
    name: Optional[str] = None
    mintAddress: Optional[str] = None
    price: float
    priceChange24h: float = 0.0
    priceChange7d: float = 0.0
    volume24h: float = 0.0
    high24h: Optional[float] = None
    low24h: Optional[float] = None
    liquidity: float = 0.0
    marketCap: float = 0.0
    holders: int = 0


class TokenListItem(BaseModel):
    """Token item in list response."""
    symbol: str
    name: str
    mintAddress: str
    price: float
    priceChange24h: float = 0.0
    priceChange7d: float = 0.0
    volume24h: float = 0.0
    liquidity: float = 0.0
    marketCap: float = 0.0
    holders: int = 0
    aiScore: Optional[float] = None  # AI profit potential score


class TokenListResponse(BaseModel):
    """Token list response with pagination."""
    tokens: List[Dict[str, Any]]
    total: int
    offset: int
    limit: int


class OHLCVItem(BaseModel):
    """Single OHLCV candle."""
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float


class OHLCVResponse(BaseModel):
    """OHLCV data response."""
    symbol: str
    interval: str
    data: List[Dict[str, Any]]


class IndicatorsResponse(BaseModel):
    """Technical indicators response."""
    rsi: float
    rsiHistory: Optional[List[float]] = None
    sma20: Optional[float] = None
    macd: Optional[Dict[str, Any]] = None
    volumeTrend: str
    support: Optional[float] = None
    resistance: Optional[float] = None
    priceAction: Optional[str] = None


class TokenWithAnalysisResponse(BaseModel):
    """Token with technical analysis response."""
    symbol: str
    price: float
    priceChange24h: float = 0.0
    volume24h: float = 0.0
    ohlcv: List[Dict[str, Any]]
    indicators: Dict[str, Any]
