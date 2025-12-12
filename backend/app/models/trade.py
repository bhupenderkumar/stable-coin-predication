"""
Trade model for database storage.
"""

from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, Enum
import enum

from app.database import Base


class TradeType(str, enum.Enum):
    BUY = "BUY"
    SELL = "SELL"


class TradeStatus(str, enum.Enum):
    PENDING = "PENDING"
    EXECUTED = "EXECUTED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class Trade(Base):
    """Trade model representing a buy/sell transaction."""
    
    __tablename__ = "trades"
    
    id = Column(Integer, primary_key=True, index=True)
    trade_id = Column(String(64), unique=True, index=True, nullable=False)
    
    # Trade details
    symbol = Column(String(20), index=True, nullable=False)
    trade_type = Column(String(10), nullable=False)  # BUY or SELL
    status = Column(String(20), default="PENDING")
    
    # Amounts
    amount_in = Column(Float, nullable=False)
    amount_out = Column(Float, default=0.0)
    price = Column(Float, default=0.0)
    fee = Column(Float, default=0.0)
    slippage_bps = Column(Integer, default=50)  # basis points
    
    # Transaction info
    tx_hash = Column(String(128), nullable=True)
    
    # Trading mode
    is_paper_trade = Column(Integer, default=1)  # 1 = paper, 0 = real
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    executed_at = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<Trade(id={self.trade_id}, symbol={self.symbol}, type={self.trade_type})>"


class Portfolio(Base):
    """Portfolio holdings model."""
    
    __tablename__ = "portfolio"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), unique=True, index=True, nullable=False)
    
    # Holdings
    amount = Column(Float, default=0.0)
    avg_buy_price = Column(Float, default=0.0)
    total_invested = Column(Float, default=0.0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Portfolio(symbol={self.symbol}, amount={self.amount})>"
