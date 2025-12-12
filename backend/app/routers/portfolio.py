"""
Portfolio Router - Portfolio management endpoints

Provides API endpoints for:
- Get portfolio summary
- Get holdings
- Update holdings
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.data_fetcher import data_fetcher

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


# In-memory portfolio storage for demo
_portfolio = {
    "cash": 10000.0,  # Starting with $10k paper money
    "holdings": {}
}


class PortfolioSummary(BaseModel):
    """Portfolio summary response."""
    totalValue: float
    cash: float
    holdingsValue: float
    pnl: float
    pnlPercentage: float
    holdings: List[dict]


class AddHoldingRequest(BaseModel):
    """Request to add a holding."""
    symbol: str
    amount: float
    avgPrice: float


@router.get("", response_model=PortfolioSummary)
async def get_portfolio():
    """
    Get portfolio summary with current valuations.
    
    Calculates total value, P&L, and individual holding performance.
    """
    holdings_list = []
    holdings_value = 0.0
    total_invested = 0.0
    
    for symbol, holding in _portfolio["holdings"].items():
        # Get current price
        ticker = await data_fetcher.get_binance_ticker(symbol)
        current_price = ticker["price"] if ticker else holding["avgPrice"]
        
        # Calculate values
        value = holding["amount"] * current_price
        invested = holding["amount"] * holding["avgPrice"]
        pnl = value - invested
        pnl_pct = ((current_price - holding["avgPrice"]) / holding["avgPrice"]) * 100 if holding["avgPrice"] > 0 else 0
        
        holdings_value += value
        total_invested += invested
        
        holdings_list.append({
            "symbol": symbol,
            "amount": holding["amount"],
            "avgPrice": holding["avgPrice"],
            "currentPrice": current_price,
            "value": value,
            "pnl": pnl,
            "pnlPercentage": pnl_pct
        })
    
    total_value = _portfolio["cash"] + holdings_value
    total_pnl = holdings_value - total_invested
    initial_value = 10000.0  # Starting capital
    pnl_pct = ((total_value - initial_value) / initial_value) * 100
    
    return {
        "totalValue": total_value,
        "cash": _portfolio["cash"],
        "holdingsValue": holdings_value,
        "pnl": total_pnl,
        "pnlPercentage": pnl_pct,
        "holdings": holdings_list
    }


@router.post("/reset")
async def reset_portfolio():
    """Reset portfolio to initial state."""
    global _portfolio
    _portfolio = {
        "cash": 10000.0,
        "holdings": {}
    }
    return {"message": "Portfolio reset to $10,000 cash"}


@router.post("/add-holding")
async def add_holding(request: AddHoldingRequest):
    """
    Manually add a holding to portfolio.
    
    Used for testing and simulation.
    """
    symbol = request.symbol.upper()
    
    if symbol in _portfolio["holdings"]:
        # Update existing holding
        existing = _portfolio["holdings"][symbol]
        total_amount = existing["amount"] + request.amount
        total_cost = (existing["amount"] * existing["avgPrice"]) + (request.amount * request.avgPrice)
        avg_price = total_cost / total_amount if total_amount > 0 else 0
        
        _portfolio["holdings"][symbol] = {
            "amount": total_amount,
            "avgPrice": avg_price
        }
    else:
        # New holding
        _portfolio["holdings"][symbol] = {
            "amount": request.amount,
            "avgPrice": request.avgPrice
        }
    
    return {
        "message": f"Added {request.amount} {symbol} at ${request.avgPrice}",
        "holding": _portfolio["holdings"][symbol]
    }


@router.delete("/holdings/{symbol}")
async def remove_holding(symbol: str):
    """Remove a holding from portfolio."""
    symbol = symbol.upper()
    
    if symbol not in _portfolio["holdings"]:
        raise HTTPException(
            status_code=404,
            detail=f"No holding found for {symbol}"
        )
    
    removed = _portfolio["holdings"].pop(symbol)
    return {
        "message": f"Removed {symbol} from portfolio",
        "removed": removed
    }
