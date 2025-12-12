"""
Trades Router - Trade execution endpoints

Provides API endpoints for:
- Execute trades (paper/live)
- Get trade history
- Get swap quotes
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services.trader import trader
from app.services.data_fetcher import data_fetcher
from app.schemas.trade import TradeRequest, TradeResponse, QuoteResponse

router = APIRouter(prefix="/trades", tags=["trades"])


class ExecuteTradeRequest(BaseModel):
    """Request body for trade execution."""
    symbol: str
    type: str = Field(..., pattern="^(BUY|SELL)$")
    amount: float = Field(..., gt=0, le=10000)
    mintAddress: Optional[str] = None
    slippageBps: int = Field(default=50, ge=1, le=1000)


class QuoteRequest(BaseModel):
    """Request body for swap quote."""
    inputMint: str
    outputMint: str
    amount: int
    slippageBps: int = 50


@router.post("", response_model=TradeResponse)
async def execute_trade(request: ExecuteTradeRequest):
    """
    Execute a trade (paper trading mode by default).
    
    In paper mode, simulates trade execution with real prices.
    """
    result = await trader.execute_trade(
        symbol=request.symbol.upper(),
        trade_type=request.type,
        amount=request.amount,
        mint_address=request.mintAddress,
        slippage_bps=request.slippageBps
    )
    
    if result.get("status") == "FAILED":
        raise HTTPException(
            status_code=400,
            detail=result.get("error", "Trade execution failed")
        )
    
    return result


@router.post("/quote", response_model=QuoteResponse)
async def get_quote(request: QuoteRequest):
    """
    Get a swap quote from Jupiter.
    
    Returns expected output amount and price impact.
    """
    quote = await trader.get_quote(
        input_mint=request.inputMint,
        output_mint=request.outputMint,
        amount=request.amount,
        slippage_bps=request.slippageBps
    )
    
    if not quote:
        raise HTTPException(
            status_code=400,
            detail="Could not get quote from Jupiter"
        )
    
    return quote


@router.get("/history")
async def get_trade_history(
    symbol: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200)
):
    """
    Get trade history.
    
    Note: In-memory storage for demo. Production would use database.
    """
    # Placeholder - would fetch from database
    return {
        "trades": [],
        "total": 0,
        "message": "Trade history will be stored in database"
    }
