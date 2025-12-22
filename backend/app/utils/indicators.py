"""
Technical indicators calculation utilities.
"""

import pandas as pd
import numpy as np
from typing import List, Dict, Optional


def calculate_rsi(prices: List[float], period: int = 14) -> List[float]:
    """
    Calculate Relative Strength Index (RSI).
    
    Args:
        prices: List of closing prices
        period: RSI period (default: 14)
    
    Returns:
        List of RSI values
    """
    if len(prices) < period + 1:
        return [50.0] * len(prices)  # Return neutral RSI if not enough data
    
    df = pd.DataFrame({'close': prices})
    delta = df['close'].diff()
    
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    
    return rsi.fillna(50.0).tolist()


def calculate_sma(prices: List[float], period: int = 20) -> List[float]:
    """
    Calculate Simple Moving Average (SMA).
    
    Args:
        prices: List of closing prices
        period: SMA period (default: 20)
    
    Returns:
        List of SMA values
    """
    df = pd.DataFrame({'close': prices})
    sma = df['close'].rolling(window=period).mean()
    return sma.bfill().tolist()


def calculate_ema(prices: List[float], period: int = 12) -> List[float]:
    """
    Calculate Exponential Moving Average (EMA).
    
    Args:
        prices: List of closing prices
        period: EMA period (default: 12)
    
    Returns:
        List of EMA values
    """
    df = pd.DataFrame({'close': prices})
    ema = df['close'].ewm(span=period, adjust=False).mean()
    return ema.tolist()


def calculate_macd(
    prices: List[float],
    fast_period: int = 12,
    slow_period: int = 26,
    signal_period: int = 9
) -> Dict[str, List[float]]:
    """
    Calculate MACD (Moving Average Convergence Divergence).
    
    Args:
        prices: List of closing prices
        fast_period: Fast EMA period
        slow_period: Slow EMA period
        signal_period: Signal line period
    
    Returns:
        Dictionary with macd, signal, and histogram values
    """
    df = pd.DataFrame({'close': prices})
    
    ema_fast = df['close'].ewm(span=fast_period, adjust=False).mean()
    ema_slow = df['close'].ewm(span=slow_period, adjust=False).mean()
    
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal_period, adjust=False).mean()
    histogram = macd_line - signal_line
    
    return {
        'macd': macd_line.tolist(),
        'signal': signal_line.tolist(),
        'histogram': histogram.tolist()
    }


def calculate_bollinger_bands(
    prices: List[float],
    period: int = 20,
    std_dev: float = 2.0
) -> Dict[str, List[float]]:
    """
    Calculate Bollinger Bands.
    
    Args:
        prices: List of closing prices
        period: SMA period
        std_dev: Standard deviation multiplier
    
    Returns:
        Dictionary with upper, middle, and lower band values
    """
    df = pd.DataFrame({'close': prices})
    
    middle = df['close'].rolling(window=period).mean()
    std = df['close'].rolling(window=period).std()
    
    upper = middle + (std * std_dev)
    lower = middle - (std * std_dev)
    
    return {
        'upper': upper.bfill().tolist(),
        'middle': middle.bfill().tolist(),
        'lower': lower.bfill().tolist()
    }


def calculate_volume_trend(volumes: List[float], period: int = 7) -> str:
    """
    Analyze volume trend over a period.
    
    Args:
        volumes: List of volume values
        period: Period to analyze
    
    Returns:
        'INCREASING', 'DECREASING', or 'STABLE'
    """
    if len(volumes) < period:
        return "STABLE"
    
    recent = volumes[-period:]
    older = volumes[-period*2:-period] if len(volumes) >= period * 2 else volumes[:period]
    
    avg_recent = np.mean(recent)
    avg_older = np.mean(older)
    
    if avg_older == 0:
        return "STABLE"
    
    change_pct = ((avg_recent - avg_older) / avg_older) * 100
    
    if change_pct > 10:
        return "INCREASING"
    elif change_pct < -10:
        return "DECREASING"
    return "STABLE"


def calculate_support_resistance(
    highs: List[float],
    lows: List[float],
    closes: List[float]
) -> Dict[str, Optional[float]]:
    """
    Calculate basic support and resistance levels.
    
    Args:
        highs: List of high prices
        lows: List of low prices
        closes: List of closing prices
    
    Returns:
        Dictionary with support and resistance levels
    """
    if not highs or not lows or not closes:
        return {'support': None, 'resistance': None}
    
    # Simple approach: use recent pivots
    df = pd.DataFrame({
        'high': highs,
        'low': lows,
        'close': closes
    })
    
    # Support: recent significant lows
    support = df['low'].rolling(window=20).min().iloc[-1] if len(lows) >= 20 else min(lows)
    
    # Resistance: recent significant highs
    resistance = df['high'].rolling(window=20).max().iloc[-1] if len(highs) >= 20 else max(highs)
    
    return {
        'support': float(support),
        'resistance': float(resistance)
    }


def get_price_action_description(
    prices: List[float],
    rsi: float,
    volume_trend: str
) -> str:
    """
    Generate a human-readable price action description.
    
    Args:
        prices: List of closing prices
        rsi: Current RSI value
        volume_trend: Volume trend string
    
    Returns:
        Price action description
    """
    if len(prices) < 2:
        return "Insufficient data for analysis"
    
    # Calculate recent momentum
    recent_change = ((prices[-1] - prices[-7]) / prices[-7]) * 100 if len(prices) >= 7 else 0
    short_term_change = ((prices[-1] - prices[-2]) / prices[-2]) * 100
    
    # Determine trend
    if recent_change > 10:
        trend = "Strong uptrend"
    elif recent_change > 5:
        trend = "Moderate uptrend"
    elif recent_change > 0:
        trend = "Slight uptrend"
    elif recent_change > -5:
        trend = "Slight downtrend"
    elif recent_change > -10:
        trend = "Moderate downtrend"
    else:
        trend = "Strong downtrend"
    
    # Add RSI context
    if rsi > 70:
        rsi_context = ", overbought conditions"
    elif rsi < 30:
        rsi_context = ", oversold conditions"
    else:
        rsi_context = ""
    
    # Add volume context
    vol_context = f" with {volume_trend.lower()} volume"
    
    return f"{trend}{rsi_context}{vol_context}"
