"""
Trades Router - Trade execution endpoints

Provides API endpoints for:
- Execute trades (paper/live)
- Get trade history
- Get swap quotes
"""

from typing import Optional, List
import json
import os
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from datetime import datetime

from app.services.trader import trader
from app.services.data_fetcher import data_fetcher
from app.schemas.trade import TradeRequest, TradeResponse, QuoteResponse

router = APIRouter(prefix="/trades", tags=["trades"])

DATA_DIR = "data"
TRADES_FILE = os.path.join(DATA_DIR, "paper_trades.json")

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

def load_trades():
    """Load trades from file or return default."""
    if os.path.exists(TRADES_FILE):
        try:
            with open(TRADES_FILE, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading trades: {e}")
    
    return []

def save_trades():
    """Save trades to file."""
    try:
        with open(TRADES_FILE, "w") as f:
            json.dump(_trade_history, f, indent=2)
    except Exception as e:
        print(f"Error saving trades: {e}")

# In-memory trade storage (initialized from file)
_trade_history: List[dict] = load_trades()


def add_trade(trade: dict):
    """Add a trade to history. Called by portfolio router after trade execution."""
    _trade_history.insert(0, trade)  # Most recent first
    # Keep only last 200 trades
    if len(_trade_history) > 200:
        _trade_history.pop()
    
    # Save changes
    save_trades()


def get_all_trades() -> List[dict]:
    """Get all trade history."""
    return _trade_history


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
    Updates portfolio and stores trade in history.
    """
    # Import here to avoid circular imports
    from app.routers.portfolio import update_portfolio_after_trade, get_portfolio_state
    
    # Validate trade against portfolio
    portfolio = get_portfolio_state()
    
    if request.type == "BUY":
        if request.amount > portfolio["cash"]:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient funds. Available: ${portfolio['cash']:.2f}"
            )
    else:  # SELL
        symbol = request.symbol.upper()
        if symbol not in portfolio["holdings"]:
            raise HTTPException(
                status_code=400,
                detail=f"No {symbol} holdings to sell"
            )
        holding = portfolio["holdings"][symbol]
        # Get current price to check if we have enough tokens
        # Use trader's price method which tries multiple sources
        price = await trader._get_token_price(symbol)
        if price:
            token_value = holding["amount"] * price
            if request.amount > token_value:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient holdings. Available: {holding['amount']:.6f} {symbol}"
                )
    
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
    
    # Update portfolio with trade results
    update_portfolio_after_trade(
        trade_type=request.type,
        symbol=request.symbol.upper(),
        amount_in=result["amountIn"],
        amount_out=result["amountOut"],
        price=result["price"]
    )
    
    # Store trade in history
    add_trade(result)
    
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
    
    Returns list of executed trades from in-memory storage.
    """
    trades = get_all_trades()
    
    # Filter by symbol if provided
    if symbol:
        trades = [t for t in trades if t.get("symbol", "").upper() == symbol.upper()]
    
    # Limit results
    trades = trades[:limit]
    
    return {
        "trades": trades,
        "total": len(trades)
    }


@router.post("/reset")
async def reset_trade_history():
    """Reset trade history."""
    global _trade_history
    _trade_history = []
    save_trades()
    return {"message": "Trade history cleared"}