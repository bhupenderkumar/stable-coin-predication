"""
Trade-related Pydantic schemas for API request/response validation.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class TradeRequest(BaseModel):
    """Trade execution request."""
    symbol: str
    type: str = Field(..., pattern="^(BUY|SELL)$")
    amount: float = Field(..., gt=0, le=10000)
    mintAddress: Optional[str] = None
    slippageBps: int = Field(default=50, ge=1, le=1000)


class TradeResponse(BaseModel):
    """Trade execution response."""
    id: str
    status: str  # PENDING, EXECUTED, FAILED
    symbol: str
    type: str  # BUY, SELL
    amountIn: Optional[float] = None
    amountOut: Optional[float] = None
    price: Optional[float] = None
    fee: Optional[float] = None
    txHash: Optional[str] = None
    isPaperTrade: bool = True
    timestamp: int
    quote: Optional[Dict[str, Any]] = None
    message: Optional[str] = None
    error: Optional[str] = None


class QuoteRequest(BaseModel):
    """Swap quote request."""
    inputMint: str
    outputMint: str
    amount: int
    slippageBps: int = 50


class QuoteResponse(BaseModel):
    """Swap quote response."""
    inputMint: str
    outputMint: str
    inAmount: int
    outAmount: int
    priceImpactPct: float
    routePlan: Optional[List[Dict[str, Any]]] = None
    otherAmountThreshold: Optional[str] = None
    slippageBps: Optional[int] = None


class PortfolioHolding(BaseModel):
    """Single portfolio holding."""
    symbol: str
    amount: float
    avgPrice: float
    currentPrice: float
    value: float
    pnl: float
    pnlPercentage: float


class PortfolioResponse(BaseModel):
    """Portfolio summary response."""
    totalValue: float
    cash: float
    holdingsValue: float
    pnl: float
    pnlPercentage: float
    holdings: List[PortfolioHolding]
