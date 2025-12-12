"""
Input validation utilities.
"""

import re
from typing import Optional
from pydantic import BaseModel, Field, validator


class TokenSymbolValidator(BaseModel):
    """Validate token symbol input."""
    
    symbol: str = Field(..., min_length=1, max_length=20)
    
    @validator('symbol')
    def validate_symbol(cls, v):
        # Allow alphanumeric and common symbols
        if not re.match(r'^[A-Za-z0-9]+$', v):
            raise ValueError('Symbol must be alphanumeric')
        return v.upper()


class TradeRequestValidator(BaseModel):
    """Validate trade request input."""
    
    symbol: str = Field(..., min_length=1, max_length=20)
    trade_type: str = Field(..., pattern='^(BUY|SELL)$')
    amount: float = Field(..., gt=0, le=10000)  # Max $10k per trade
    slippage_bps: int = Field(default=50, ge=1, le=1000)  # 0.01% to 10%
    
    @validator('symbol')
    def validate_symbol(cls, v):
        return v.upper()


class AnalysisRequestValidator(BaseModel):
    """Validate analysis request input."""
    
    symbol: str = Field(..., min_length=1, max_length=20)
    include_indicators: bool = Field(default=True)
    
    @validator('symbol')
    def validate_symbol(cls, v):
        return v.upper()


class OHLCVRequestValidator(BaseModel):
    """Validate OHLCV data request."""
    
    symbol: str = Field(..., min_length=1, max_length=20)
    interval: str = Field(default="1h", pattern='^(1m|5m|15m|1h|4h|1d|1w)$')
    limit: int = Field(default=168, ge=1, le=1000)
    
    @validator('symbol')
    def validate_symbol(cls, v):
        return v.upper()


def validate_mint_address(address: str) -> bool:
    """
    Validate Solana mint address format.
    
    Args:
        address: Mint address to validate
    
    Returns:
        True if valid format, False otherwise
    """
    # Solana addresses are base58 encoded, 32-44 characters
    if not address or len(address) < 32 or len(address) > 44:
        return False
    
    # Check for valid base58 characters
    base58_chars = set('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz')
    return all(c in base58_chars for c in address)


def sanitize_symbol(symbol: str) -> str:
    """
    Sanitize and normalize token symbol.
    
    Args:
        symbol: Raw symbol input
    
    Returns:
        Sanitized symbol
    """
    # Remove whitespace and special chars, uppercase
    return re.sub(r'[^A-Za-z0-9]', '', symbol).upper()


def validate_amount(amount: float, min_val: float = 0.01, max_val: float = 10000) -> bool:
    """
    Validate trade amount.
    
    Args:
        amount: Amount to validate
        min_val: Minimum allowed value
        max_val: Maximum allowed value
    
    Returns:
        True if valid, False otherwise
    """
    return min_val <= amount <= max_val
