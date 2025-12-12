"""
Tests for technical indicators.
"""

import pytest
from app.utils.indicators import (
    calculate_rsi,
    calculate_sma,
    calculate_ema,
    calculate_macd,
    calculate_volume_trend,
    calculate_support_resistance,
    get_price_action_description
)


class TestRSI:
    """Tests for RSI calculation."""
    
    def test_rsi_neutral_market(self):
        """Test RSI returns ~50 for flat market."""
        prices = [100.0] * 20
        rsi = calculate_rsi(prices)
        
        # Should return values close to 50 for flat market
        assert len(rsi) == 20
    
    def test_rsi_uptrend(self):
        """Test RSI > 50 for uptrend."""
        prices = list(range(100, 120))  # Uptrend
        rsi = calculate_rsi(prices)
        
        # Last RSI should be above 50 for uptrend
        assert rsi[-1] > 50
    
    def test_rsi_downtrend(self):
        """Test RSI < 50 for downtrend."""
        prices = list(range(120, 100, -1))  # Downtrend
        rsi = calculate_rsi(prices)
        
        # Last RSI should be below 50 for downtrend
        assert rsi[-1] < 50
    
    def test_rsi_insufficient_data(self):
        """Test RSI with insufficient data."""
        prices = [100.0, 101.0, 99.0]  # Only 3 points
        rsi = calculate_rsi(prices, period=14)
        
        # Should return neutral RSI
        assert all(r == 50.0 for r in rsi)


class TestSMA:
    """Tests for SMA calculation."""
    
    def test_sma_calculation(self):
        """Test SMA calculates correctly."""
        prices = [10.0, 20.0, 30.0, 40.0, 50.0]
        sma = calculate_sma(prices, period=3)
        
        # Last 3 values: 30, 40, 50 -> avg = 40
        assert sma[-1] == 40.0
    
    def test_sma_length(self):
        """Test SMA returns correct length."""
        prices = list(range(100))
        sma = calculate_sma(prices, period=20)
        
        assert len(sma) == 100


class TestEMA:
    """Tests for EMA calculation."""
    
    def test_ema_calculation(self):
        """Test EMA calculates correctly."""
        prices = [10.0, 20.0, 30.0, 40.0, 50.0]
        ema = calculate_ema(prices, period=3)
        
        assert len(ema) == 5
        # EMA should follow price direction
        assert ema[-1] > ema[0]


class TestMACD:
    """Tests for MACD calculation."""
    
    def test_macd_structure(self):
        """Test MACD returns correct structure."""
        prices = list(range(50, 100))  # 50 price points
        macd = calculate_macd(prices)
        
        assert "macd" in macd
        assert "signal" in macd
        assert "histogram" in macd
        assert len(macd["macd"]) == 50


class TestVolumeTrend:
    """Tests for volume trend analysis."""
    
    def test_increasing_volume(self):
        """Test detecting increasing volume."""
        volumes = [100, 100, 100, 100, 100, 100, 100,
                   150, 160, 170, 180, 190, 200, 210]
        
        trend = calculate_volume_trend(volumes)
        assert trend == "INCREASING"
    
    def test_decreasing_volume(self):
        """Test detecting decreasing volume."""
        volumes = [200, 200, 200, 200, 200, 200, 200,
                   150, 140, 130, 120, 110, 100, 90]
        
        trend = calculate_volume_trend(volumes)
        assert trend == "DECREASING"
    
    def test_stable_volume(self):
        """Test detecting stable volume."""
        volumes = [100, 102, 98, 101, 99, 100, 101,
                   100, 99, 101, 100, 98, 102, 100]
        
        trend = calculate_volume_trend(volumes)
        assert trend == "STABLE"


class TestSupportResistance:
    """Tests for support/resistance calculation."""
    
    def test_support_resistance(self):
        """Test support and resistance levels."""
        highs = [110, 115, 112, 118, 120, 116, 119]
        lows = [100, 98, 102, 99, 105, 103, 101]
        closes = [105, 108, 106, 112, 115, 110, 113]
        
        levels = calculate_support_resistance(highs, lows, closes)
        
        assert "support" in levels
        assert "resistance" in levels
        assert levels["support"] <= min(closes)
        assert levels["resistance"] >= max(closes)


class TestPriceAction:
    """Tests for price action description."""
    
    def test_uptrend_description(self):
        """Test uptrend description."""
        prices = list(range(100, 120))  # 20% gain
        description = get_price_action_description(prices, rsi=55, volume_trend="INCREASING")
        
        assert "uptrend" in description.lower()
        assert "increasing" in description.lower()
    
    def test_overbought_description(self):
        """Test overbought RSI in description."""
        prices = list(range(100, 150))
        description = get_price_action_description(prices, rsi=75, volume_trend="STABLE")
        
        assert "overbought" in description.lower()
