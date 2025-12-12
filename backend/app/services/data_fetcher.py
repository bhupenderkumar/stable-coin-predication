"""
Data Fetcher Service - External API Integration

This service handles all external API calls for crypto data:
- Binance API for OHLCV data
- Birdeye API for Solana token data
- Jupiter API for swap quotes

Agent 2 Responsibility: Data Service Specialist
"""

import asyncio
import time
from typing import List, Dict, Optional, Any
from datetime import datetime
import httpx
import pandas as pd

from app.config import settings
from app.utils.cache import cache
from app.utils.indicators import (
    calculate_rsi,
    calculate_volume_trend,
    calculate_sma,
    calculate_macd,
    calculate_support_resistance,
    get_price_action_description
)


class RateLimiter:
    """Simple rate limiter for API calls."""
    
    def __init__(self, max_requests: int, period: int):
        self.max_requests = max_requests
        self.period = period  # in seconds
        self.requests: List[float] = []
    
    async def acquire(self):
        """Wait if rate limit is exceeded."""
        now = time.time()
        # Remove old requests outside the period
        self.requests = [r for r in self.requests if now - r < self.period]
        
        if len(self.requests) >= self.max_requests:
            # Wait until oldest request expires
            sleep_time = self.period - (now - self.requests[0])
            if sleep_time > 0:
                await asyncio.sleep(sleep_time)
        
        self.requests.append(time.time())


class DataFetcher:
    """
    Main data fetcher service for external API integration.
    Handles Binance, Birdeye, and Jupiter APIs.
    """
    
    def __init__(self):
        self.binance_url = settings.binance_api_url
        self.birdeye_url = settings.birdeye_api_url
        self.jupiter_url = settings.jupiter_api_url
        
        # Rate limiters for each API
        self.binance_limiter = RateLimiter(max_requests=1200, period=60)
        self.birdeye_limiter = RateLimiter(max_requests=100, period=60)
        self.jupiter_limiter = RateLimiter(max_requests=600, period=60)
        
        # HTTP client settings
        self.timeout = httpx.Timeout(30.0, connect=10.0)
    
    # =========================================
    # BINANCE API METHODS
    # =========================================
    
    async def get_binance_ohlcv(
        self,
        symbol: str,
        interval: str = "1h",
        limit: int = 168
    ) -> List[Dict[str, Any]]:
        """
        Fetch OHLCV (candlestick) data from Binance.
        
        Args:
            symbol: Trading pair symbol (e.g., 'BTC', 'SOL')
            interval: Timeframe (1m, 5m, 15m, 1h, 4h, 1d, 1w)
            limit: Number of candles to fetch (max 1000)
        
        Returns:
            List of OHLCV data points
        """
        # Check cache first
        cached = await cache.get_ohlcv(symbol, interval)
        if cached:
            return cached
        
        await self.binance_limiter.acquire()
        
        # Binance requires USDT pair
        pair = f"{symbol.upper()}USDT"
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.binance_url}/klines",
                    params={
                        "symbol": pair,
                        "interval": interval,
                        "limit": min(limit, 1000)
                    }
                )
                
                if response.status_code == 200:
                    raw_data = response.json()
                    ohlcv = self._parse_binance_ohlcv(raw_data)
                    
                    # Cache the result
                    await cache.set_ohlcv(symbol, interval, ohlcv)
                    
                    return ohlcv
                else:
                    print(f"Binance API error: {response.status_code}")
                    return []
                    
        except httpx.TimeoutException:
            print(f"Binance API timeout for {symbol}")
            return []
        except Exception as e:
            print(f"Binance API error: {e}")
            return []
    
    def _parse_binance_ohlcv(self, raw_data: List) -> List[Dict[str, Any]]:
        """Parse Binance klines response into OHLCV format."""
        ohlcv = []
        for candle in raw_data:
            ohlcv.append({
                "timestamp": int(candle[0]),
                "open": float(candle[1]),
                "high": float(candle[2]),
                "low": float(candle[3]),
                "close": float(candle[4]),
                "volume": float(candle[5]),
                "close_time": int(candle[6]),
                "quote_volume": float(candle[7]),
                "trades": int(candle[8])
            })
        return ohlcv
    
    async def get_binance_ticker(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Fetch 24h ticker data from Binance.
        
        Args:
            symbol: Trading symbol (e.g., 'BTC', 'SOL')
        
        Returns:
            Ticker data with price and volume info
        """
        await self.binance_limiter.acquire()
        
        pair = f"{symbol.upper()}USDT"
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.binance_url}/ticker/24hr",
                    params={"symbol": pair}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "symbol": symbol.upper(),
                        "price": float(data["lastPrice"]),
                        "priceChange24h": float(data["priceChangePercent"]),
                        "volume24h": float(data["quoteVolume"]),
                        "high24h": float(data["highPrice"]),
                        "low24h": float(data["lowPrice"])
                    }
                return None
                
        except Exception as e:
            print(f"Binance ticker error: {e}")
            return None
    
    # =========================================
    # BIRDEYE API METHODS
    # =========================================
    
    async def get_birdeye_tokens(
        self,
        sort_by: str = "v24hUSD",
        sort_type: str = "desc",
        offset: int = 0,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Fetch trending Solana tokens from Birdeye.
        
        Args:
            sort_by: Sort field (v24hUSD, v24hChangePercent, mc)
            sort_type: Sort direction (asc, desc)
            offset: Pagination offset
            limit: Number of tokens to fetch
        
        Returns:
            List of token data
        """
        # Check cache first
        cached = await cache.get_tokens()
        if cached:
            return cached
        
        await self.birdeye_limiter.acquire()
        
        headers = {}
        if settings.birdeye_api_key:
            headers["X-API-KEY"] = settings.birdeye_api_key
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.birdeye_url}/defi/tokenlist",
                    headers=headers,
                    params={
                        "sort_by": sort_by,
                        "sort_type": sort_type,
                        "offset": offset,
                        "limit": limit
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    tokens = self._parse_birdeye_tokens(data.get("data", {}).get("tokens", []))
                    
                    # Cache the result
                    await cache.set_tokens(tokens)
                    
                    return tokens
                else:
                    print(f"Birdeye API error: {response.status_code}")
                    return []
                    
        except Exception as e:
            print(f"Birdeye API error: {e}")
            return []
    
    def _parse_birdeye_tokens(self, raw_tokens: List) -> List[Dict[str, Any]]:
        """Parse Birdeye token list into our format."""
        tokens = []
        for token in raw_tokens:
            tokens.append({
                "symbol": token.get("symbol", ""),
                "name": token.get("name", ""),
                "mintAddress": token.get("address", ""),
                "price": float(token.get("price", 0) or 0),
                "priceChange24h": float(token.get("v24hChangePercent", 0) or 0),
                "priceChange7d": 0,  # Not available in basic API
                "volume24h": float(token.get("v24hUSD", 0) or 0),
                "liquidity": float(token.get("liquidity", 0) or 0),
                "marketCap": float(token.get("mc", 0) or 0),
                "holders": int(token.get("holder", 0) or 0)
            })
        return tokens
    
    async def get_birdeye_token_info(self, address: str) -> Optional[Dict[str, Any]]:
        """
        Fetch detailed token info from Birdeye.
        
        Args:
            address: Token mint address
        
        Returns:
            Token info dict
        """
        await self.birdeye_limiter.acquire()
        
        headers = {}
        if settings.birdeye_api_key:
            headers["X-API-KEY"] = settings.birdeye_api_key
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.birdeye_url}/defi/token_overview",
                    headers=headers,
                    params={"address": address}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("data", {})
                return None
                
        except Exception as e:
            print(f"Birdeye token info error: {e}")
            return None
    
    async def get_birdeye_ohlcv(
        self,
        address: str,
        interval: str = "1H",
        time_from: Optional[int] = None,
        time_to: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch OHLCV data for a Solana token from Birdeye.
        
        Args:
            address: Token mint address
            interval: Timeframe (1m, 5m, 15m, 1H, 4H, 1D, 1W)
            time_from: Start timestamp
            time_to: End timestamp
        
        Returns:
            List of OHLCV data
        """
        await self.birdeye_limiter.acquire()
        
        headers = {}
        if settings.birdeye_api_key:
            headers["X-API-KEY"] = settings.birdeye_api_key
        
        # Default to last 7 days if not specified
        if not time_to:
            time_to = int(datetime.now().timestamp())
        if not time_from:
            time_from = time_to - (7 * 24 * 60 * 60)
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.birdeye_url}/defi/ohlcv",
                    headers=headers,
                    params={
                        "address": address,
                        "type": interval,
                        "time_from": time_from,
                        "time_to": time_to
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    items = data.get("data", {}).get("items", [])
                    return self._parse_birdeye_ohlcv(items)
                return []
                
        except Exception as e:
            print(f"Birdeye OHLCV error: {e}")
            return []
    
    def _parse_birdeye_ohlcv(self, items: List) -> List[Dict[str, Any]]:
        """Parse Birdeye OHLCV response."""
        ohlcv = []
        for item in items:
            ohlcv.append({
                "timestamp": int(item.get("unixTime", 0)) * 1000,
                "open": float(item.get("o", 0)),
                "high": float(item.get("h", 0)),
                "low": float(item.get("l", 0)),
                "close": float(item.get("c", 0)),
                "volume": float(item.get("v", 0))
            })
        return ohlcv
    
    # =========================================
    # JUPITER API METHODS
    # =========================================
    
    async def get_jupiter_quote(
        self,
        input_mint: str,
        output_mint: str,
        amount: int,
        slippage_bps: int = 50
    ) -> Optional[Dict[str, Any]]:
        """
        Get swap quote from Jupiter Aggregator.
        
        Args:
            input_mint: Input token mint address
            output_mint: Output token mint address
            amount: Amount in smallest unit (lamports/tokens)
            slippage_bps: Slippage tolerance in basis points
        
        Returns:
            Quote data with route info
        """
        # Check cache first (short TTL)
        cached = await cache.get_quote(input_mint, output_mint, amount)
        if cached:
            return cached
        
        await self.jupiter_limiter.acquire()
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.jupiter_url}/quote",
                    params={
                        "inputMint": input_mint,
                        "outputMint": output_mint,
                        "amount": amount,
                        "slippageBps": slippage_bps
                    }
                )
                
                if response.status_code == 200:
                    quote = response.json()
                    
                    # Parse and cache
                    parsed = self._parse_jupiter_quote(quote)
                    await cache.set_quote(input_mint, output_mint, amount, parsed)
                    
                    return parsed
                else:
                    print(f"Jupiter API error: {response.status_code}")
                    return None
                    
        except Exception as e:
            print(f"Jupiter quote error: {e}")
            return None
    
    def _parse_jupiter_quote(self, quote: Dict) -> Dict[str, Any]:
        """Parse Jupiter quote response."""
        return {
            "inputMint": quote.get("inputMint"),
            "outputMint": quote.get("outputMint"),
            "inAmount": int(quote.get("inAmount", 0)),
            "outAmount": int(quote.get("outAmount", 0)),
            "priceImpactPct": float(quote.get("priceImpactPct", 0)),
            "routePlan": quote.get("routePlan", []),
            "otherAmountThreshold": quote.get("otherAmountThreshold"),
            "slippageBps": quote.get("slippageBps")
        }
    
    async def get_jupiter_price(self, token_ids: List[str]) -> Dict[str, float]:
        """
        Get token prices from Jupiter Price API.
        
        Args:
            token_ids: List of token mint addresses
        
        Returns:
            Dictionary of mint address -> price
        """
        await self.jupiter_limiter.acquire()
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    "https://price.jup.ag/v4/price",
                    params={"ids": ",".join(token_ids)}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    prices = {}
                    for token_id, info in data.get("data", {}).items():
                        prices[token_id] = float(info.get("price", 0))
                    return prices
                return {}
                
        except Exception as e:
            print(f"Jupiter price error: {e}")
            return {}
    
    async def get_jupiter_tokens(self) -> List[Dict[str, Any]]:
        """
        Get list of all tokens supported by Jupiter.
        
        Returns:
            List of token info
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get("https://token.jup.ag/all")
                
                if response.status_code == 200:
                    return response.json()
                return []
                
        except Exception as e:
            print(f"Jupiter tokens error: {e}")
            return []
    
    # =========================================
    # COMBINED/ENRICHED DATA METHODS
    # =========================================
    
    async def get_token_with_analysis(
        self,
        symbol: str,
        interval: str = "1h"
    ) -> Optional[Dict[str, Any]]:
        """
        Get token data with technical indicators.
        
        Args:
            symbol: Token symbol
            interval: OHLCV interval
        
        Returns:
            Token data with RSI, volume trend, etc.
        """
        # Fetch OHLCV data
        ohlcv = await self.get_binance_ohlcv(symbol, interval)
        
        if not ohlcv:
            return None
        
        # Extract price and volume arrays
        closes = [c["close"] for c in ohlcv]
        highs = [c["high"] for c in ohlcv]
        lows = [c["low"] for c in ohlcv]
        volumes = [c["volume"] for c in ohlcv]
        
        # Calculate indicators
        rsi_values = calculate_rsi(closes)
        current_rsi = rsi_values[-1] if rsi_values else 50
        
        volume_trend = calculate_volume_trend(volumes)
        
        sma_20 = calculate_sma(closes, 20)
        
        macd = calculate_macd(closes)
        
        support_resistance = calculate_support_resistance(highs, lows, closes)
        
        price_action = get_price_action_description(closes, current_rsi, volume_trend)
        
        # Get current price
        ticker = await self.get_binance_ticker(symbol)
        
        return {
            "symbol": symbol.upper(),
            "price": ticker["price"] if ticker else closes[-1],
            "priceChange24h": ticker["priceChange24h"] if ticker else 0,
            "volume24h": ticker["volume24h"] if ticker else sum(volumes[-24:]),
            "ohlcv": ohlcv[-100:],  # Last 100 candles
            "indicators": {
                "rsi": round(current_rsi, 2),
                "rsiHistory": rsi_values[-20:],
                "sma20": sma_20[-1] if sma_20 else None,
                "macd": {
                    "value": macd["macd"][-1] if macd["macd"] else None,
                    "signal": macd["signal"][-1] if macd["signal"] else None,
                    "histogram": macd["histogram"][-1] if macd["histogram"] else None
                },
                "volumeTrend": volume_trend,
                "support": support_resistance["support"],
                "resistance": support_resistance["resistance"],
                "priceAction": price_action
            }
        }


# Global data fetcher instance
data_fetcher = DataFetcher()
