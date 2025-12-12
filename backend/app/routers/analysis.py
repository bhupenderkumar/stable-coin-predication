"""
Analysis Router - AI Analysis endpoints

Provides API endpoints for:
- Request AI analysis for a token
- Get analysis history
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel

from app.services.data_fetcher import data_fetcher
from app.services.ai_analyzer import ai_analyzer
from app.schemas.analysis import AnalysisRequest, AnalysisResponse

router = APIRouter(prefix="/analysis", tags=["analysis"])


class AnalyzeTokenRequest(BaseModel):
    """Request body for token analysis."""
    symbol: str
    interval: str = "1h"


@router.post("", response_model=AnalysisResponse)
async def analyze_token(request: AnalyzeTokenRequest):
    """
    Request AI analysis for a token.
    
    Returns trading recommendation with confidence score and reasoning.
    """
    symbol = request.symbol.upper()
    
    # Get token data with indicators
    token_data = await data_fetcher.get_token_with_analysis(
        symbol=symbol,
        interval=request.interval
    )
    
    if not token_data:
        raise HTTPException(
            status_code=404,
            detail=f"Could not fetch data for {symbol}"
        )
    
    # Run AI analysis
    analysis = await ai_analyzer.analyze_token(
        symbol=symbol,
        token_data=token_data,
        ohlcv=token_data.get("ohlcv", []),
        indicators=token_data.get("indicators", {})
    )
    
    return analysis


@router.post("/quick/{symbol}", response_model=AnalysisResponse)
async def quick_analyze(symbol: str):
    """
    Quick analysis endpoint - just provide symbol.
    
    Uses default settings for rapid analysis.
    """
    # Get token data with indicators
    token_data = await data_fetcher.get_token_with_analysis(
        symbol=symbol.upper(),
        interval="1h"
    )
    
    if not token_data:
        raise HTTPException(
            status_code=404,
            detail=f"Could not fetch data for {symbol}"
        )
    
    # Run AI analysis
    analysis = await ai_analyzer.analyze_token(
        symbol=symbol.upper(),
        token_data=token_data,
        ohlcv=token_data.get("ohlcv", []),
        indicators=token_data.get("indicators", {})
    )
    
    return analysis
