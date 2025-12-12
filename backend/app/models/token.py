"""
Token model for database storage.
"""

from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, Boolean

from app.database import Base


class Token(Base):
    """Token model representing a cryptocurrency token."""
    
    __tablename__ = "tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    mint_address = Column(String(64), unique=True, nullable=False)
    
    # Price data
    price = Column(Float, default=0.0)
    price_change_24h = Column(Float, default=0.0)
    price_change_7d = Column(Float, default=0.0)
    
    # Volume and liquidity
    volume_24h = Column(Float, default=0.0)
    liquidity = Column(Float, default=0.0)
    market_cap = Column(Float, default=0.0)
    
    # Holder info
    holders = Column(Integer, default=0)
    
    # Metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Token(symbol={self.symbol}, price={self.price})>"


class TokenOHLCV(Base):
    """OHLCV (candlestick) data for tokens."""
    
    __tablename__ = "token_ohlcv"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), index=True, nullable=False)
    
    # OHLCV data
    timestamp = Column(Integer, nullable=False)  # Unix timestamp
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Float, nullable=False)
    
    # Interval (1m, 5m, 15m, 1h, 4h, 1d)
    interval = Column(String(10), default="1h")
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<OHLCV(symbol={self.symbol}, timestamp={self.timestamp})>"
