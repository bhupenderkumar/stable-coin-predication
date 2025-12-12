"""
Analysis model for AI-generated trading signals.
"""

from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, Text
import enum

from app.database import Base


class Decision(str, enum.Enum):
    BUY = "BUY"
    SELL = "SELL"
    NO_BUY = "NO_BUY"
    HOLD = "HOLD"


class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class Analysis(Base):
    """AI Analysis model for storing trading signals."""
    
    __tablename__ = "analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(String(64), unique=True, index=True, nullable=False)
    
    # Token info
    symbol = Column(String(20), index=True, nullable=False)
    
    # AI Decision
    decision = Column(String(10), nullable=False)  # BUY, SELL, NO_BUY, HOLD
    confidence = Column(Float, default=0.0)  # 0-100
    risk_level = Column(String(10), default="MEDIUM")
    reasoning = Column(Text, nullable=True)
    
    # Technical Indicators
    rsi = Column(Float, nullable=True)
    volume_trend = Column(String(20), nullable=True)  # INCREASING, DECREASING, STABLE
    price_action = Column(String(200), nullable=True)
    
    # Additional metrics
    support_level = Column(Float, nullable=True)
    resistance_level = Column(Float, nullable=True)
    
    # Model info
    model_used = Column(String(50), default="llama-3.1-70b-versatile")
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<Analysis(symbol={self.symbol}, decision={self.decision}, confidence={self.confidence})>"
