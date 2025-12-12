"""
Analysis-related Pydantic schemas for API request/response validation.
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class TokenData(BaseModel):
    """Token data for analysis."""
    symbol: str
    name: Optional[str] = None
    price: float
    price_change_24h: Optional[float] = None
    price_change_7d: Optional[float] = None
    volume_24h: Optional[float] = None
    liquidity: Optional[float] = None
    market_cap: Optional[float] = None
    holders: Optional[int] = None


class OHLCVData(BaseModel):
    """OHLCV candle data."""
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float


class AnalysisRequest(BaseModel):
    """Request body for AI analysis."""
    symbol: str
    interval: str = "1h"
    includeIndicators: bool = True


class IndicatorsDetail(BaseModel):
    """Technical indicators detail."""
    rsi: float
    volumeTrend: str
    priceAction: str


class AnalysisResponse(BaseModel):
    """AI analysis response."""
    analysisId: Optional[str] = None
    symbol: str
    decision: str  # BUY, NO_BUY, SELL
    confidence: float = Field(ge=0, le=100)
    reasoning: str
    riskLevel: str  # LOW, MEDIUM, HIGH
    indicators: Dict[str, Any]
    entryPrice: Optional[float] = None
    targetPrice: Optional[float] = None
    stopLoss: Optional[float] = None
    modelUsed: Optional[str] = None
    timestamp: Optional[str] = None
