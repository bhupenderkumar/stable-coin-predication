"""
Tokens Router - Token data endpoints

Provides API endpoints for:
- List trending tokens
- Get token details
- Get OHLCV data
- Get token with analysis
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query

from app.services.data_fetcher import data_fetcher
from app.schemas.token import (
    TokenResponse,
    TokenListResponse,
    OHLCVResponse,
    TokenWithAnalysisResponse
)

router = APIRouter(prefix="/tokens", tags=["tokens"])


@router.get("", response_model=TokenListResponse)
async def get_tokens(
    sort_by: str = Query(default="v24hUSD", description="Sort field"),
    sort_type: str = Query(default="desc", description="Sort direction"),
    offset: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=20, ge=1, le=100, description="Number of tokens")
):
    """
    Get list of trending tokens.
    
    Returns tokens sorted by volume, with price and liquidity data.
    """
    tokens = await data_fetcher.get_birdeye_tokens(
        sort_by=sort_by,
        sort_type=sort_type,
        offset=offset,
        limit=limit
    )
    
    return {
        "tokens": tokens,
        "total": len(tokens),
        "offset": offset,
        "limit": limit
    }


@router.get("/{symbol}", response_model=TokenResponse)
async def get_token(symbol: str):
    """
    Get detailed information for a specific token.
    
    Uses Binance ticker data for price info.
    """
    ticker = await data_fetcher.get_binance_ticker(symbol.upper())
    
    if not ticker:
        raise HTTPException(
            status_code=404,
            detail=f"Token {symbol} not found"
        )
    
    return ticker


@router.get("/{symbol}/ohlcv", response_model=OHLCVResponse)
async def get_token_ohlcv(
    symbol: str,
    interval: str = Query(default="1h", description="Timeframe (1m, 5m, 15m, 1h, 4h, 1d)"),
    limit: int = Query(default=168, ge=1, le=1000, description="Number of candles")
):
    """
    Get OHLCV (candlestick) data for a token.
    
    Returns historical price data with open, high, low, close, and volume.
    """
    ohlcv = await data_fetcher.get_binance_ohlcv(
        symbol=symbol.upper(),
        interval=interval,
        limit=limit
    )
    
    if not ohlcv:
        raise HTTPException(
            status_code=404,
            detail=f"OHLCV data not found for {symbol}"
        )
    
    return {
        "symbol": symbol.upper(),
        "interval": interval,
        "data": ohlcv
    }


@router.get("/{symbol}/analysis", response_model=TokenWithAnalysisResponse)
async def get_token_with_analysis(
    symbol: str,
    interval: str = Query(default="1h", description="Timeframe for analysis")
):
    """
    Get token data with technical analysis indicators.
    
    Returns price data along with RSI, volume trends, support/resistance, etc.
    """
    result = await data_fetcher.get_token_with_analysis(
        symbol=symbol.upper(),
        interval=interval
    )
    
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"Could not analyze {symbol}"
        )
    
    return result
