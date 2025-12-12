"""
Tests for data fetcher service.
"""

import pytest
from unittest.mock import AsyncMock, patch

from app.services.data_fetcher import DataFetcher, RateLimiter


class TestRateLimiter:
    """Tests for rate limiter utility."""
    
    @pytest.mark.asyncio
    async def test_rate_limiter_allows_requests(self):
        """Test rate limiter allows requests under limit."""
        limiter = RateLimiter(max_requests=10, period=60)
        
        # Should not block
        for _ in range(5):
            await limiter.acquire()
        
        assert len(limiter.requests) == 5
    
    @pytest.mark.asyncio
    async def test_rate_limiter_tracks_requests(self):
        """Test rate limiter tracks request count."""
        limiter = RateLimiter(max_requests=3, period=60)
        
        await limiter.acquire()
        await limiter.acquire()
        
        assert len(limiter.requests) == 2


class TestDataFetcher:
    """Tests for data fetcher service."""
    
    def test_init(self):
        """Test data fetcher initialization."""
        fetcher = DataFetcher()
        
        assert fetcher.binance_url is not None
        assert fetcher.jupiter_url is not None
        assert fetcher.birdeye_url is not None
    
    def test_parse_binance_ohlcv(self):
        """Test parsing Binance OHLCV response."""
        fetcher = DataFetcher()
        
        raw_data = [
            [
                1699920000000,  # timestamp
                "36000.00",     # open
                "36500.00",     # high
                "35800.00",     # low
                "36200.00",     # close
                "1000.50",      # volume
                1699923599999,  # close time
                "36100000.00",  # quote volume
                5000,           # trades
                "500.25",       # taker buy base
                "18050000.00",  # taker buy quote
                "0"             # ignore
            ]
        ]
        
        result = fetcher._parse_binance_ohlcv(raw_data)
        
        assert len(result) == 1
        assert result[0]["open"] == 36000.00
        assert result[0]["high"] == 36500.00
        assert result[0]["close"] == 36200.00
        assert result[0]["volume"] == 1000.50
    
    def test_parse_birdeye_tokens(self):
        """Test parsing Birdeye token response."""
        fetcher = DataFetcher()
        
        raw_tokens = [
            {
                "symbol": "BONK",
                "name": "Bonk",
                "address": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
                "price": 0.00002341,
                "v24hChangePercent": 5.67,
                "v24hUSD": 45000000,
                "liquidity": 8500000,
                "mc": 1450000000,
                "holder": 567890
            }
        ]
        
        result = fetcher._parse_birdeye_tokens(raw_tokens)
        
        assert len(result) == 1
        assert result[0]["symbol"] == "BONK"
        assert result[0]["price"] == 0.00002341
        assert result[0]["volume24h"] == 45000000
    
    def test_parse_jupiter_quote(self):
        """Test parsing Jupiter quote response."""
        fetcher = DataFetcher()
        
        quote = {
            "inputMint": "So11111111111111111111111111111111111111112",
            "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            "inAmount": "100000000",
            "outAmount": "5000000",
            "priceImpactPct": "0.01",
            "routePlan": [],
            "slippageBps": 50
        }
        
        result = fetcher._parse_jupiter_quote(quote)
        
        assert result["inputMint"] == quote["inputMint"]
        assert result["inAmount"] == 100000000
        assert result["outAmount"] == 5000000
