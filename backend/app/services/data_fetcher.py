"""
Data Fetcher Service - External API Integration

This service handles all external API calls for crypto data:
- Binance API for OHLCV data
- Jupiter API for Solana token data and prices (FREE, no API key needed)
- CoinGecko API for additional market data (FREE tier)

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
    Handles Binance, Jupiter, and CoinGecko APIs.
    """
    
    def __init__(self):
        self.binance_url = settings.binance_api_url
        self.jupiter_url = settings.jupiter_api_url
        self.jupiter_price_url = "https://price.jup.ag/v6"
        self.jupiter_token_url = "https://token.jup.ag"
        self.coingecko_url = "https://api.coingecko.com/api/v3"
        
        # Rate limiters for each API
        self.binance_limiter = RateLimiter(max_requests=1200, period=60)
        self.jupiter_limiter = RateLimiter(max_requests=600, period=60)
        self.coingecko_limiter = RateLimiter(max_requests=30, period=60)
        
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
        
        Returns:clear

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
    # JUPITER + COINGECKO API METHODS (Replaces Birdeye)
    # =========================================
    
    # Popular Solana meme tokens with their addresses
    SOLANA_MEME_TOKENS = {
        "BONK": {
            "address": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
            "name": "Bonk",
            "coingecko_id": "bonk"
        },
        "WIF": {
            "address": "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
            "name": "dogwifhat",
            "coingecko_id": "dogwifcoin"
        },
        "POPCAT": {
            "address": "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
            "name": "Popcat",
            "coingecko_id": "popcat"
        },
        "MEW": {
            "address": "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5",
            "name": "cat in a dogs world",
            "coingecko_id": "cat-in-a-dogs-world"
        },
        "SAMO": {
            "address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
            "name": "Samoyedcoin",
            "coingecko_id": "samoyedcoin"
        },
        "BOME": {
            "address": "ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82",
            "name": "BOOK OF MEME",
            "coingecko_id": "book-of-meme"
        },
        "SLERF": {
            "address": "7BgBvyjrZX1YKz4oh9mjb8ZScatkkwb8DzFx7LoiVkM3",
            "name": "Slerf",
            "coingecko_id": "slerf"
        },
        "PONKE": {
            "address": "5z3EqYQo9HiCEs3R84RCDMu2n7anpDMxRhdK8PSWmrRC",
            "name": "Ponke",
            "coingecko_id": "ponke"
        },
        "WEN": {
            "address": "WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk",
            "name": "Wen",
            "coingecko_id": "wen-4"
        },
        "MYRO": {
            "address": "HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4",
            "name": "Myro",
            "coingecko_id": "myro"
        }
    }
    
    async def get_solana_tokens(
        self,
        sort_by: str = "volume",
        sort_type: str = "desc",
        offset: int = 0,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Fetch Solana meme tokens with prices from CoinGecko (FREE API).
        
        Args:
            sort_by: Sort field (volume, price, change)
            sort_type: Sort direction (asc, desc)
            offset: Pagination offset
            limit: Number of tokens to fetch
        
        Returns:
            List of token data with real-time prices
        """
        # Check cache first
        cached = await cache.get_tokens()
        if cached:
            return cached[offset:offset+limit]
        
        tokens = []
        
        try:
            # Get market data from CoinGecko (FREE tier - no API key needed)
            coingecko_ids = [info["coingecko_id"] for info in self.SOLANA_MEME_TOKENS.values()]
            market_data = await self._get_coingecko_market_data(coingecko_ids)
            
            # Build token list using CoinGecko data
            for symbol, info in self.SOLANA_MEME_TOKENS.items():
                address = info["address"]
                cg_data = market_data.get(info["coingecko_id"], {})
                
                # Use CoinGecko price as primary source
                price = float(cg_data.get("price", 0) or 0)
                
                tokens.append({
                    "symbol": symbol,
                    "name": info["name"],
                    "mintAddress": address,
                    "price": price,
                    "priceChange24h": float(cg_data.get("price_change_percentage_24h", 0) or 0),
                    "priceChange7d": float(cg_data.get("price_change_percentage_7d", 0) or 0),
                    "volume24h": float(cg_data.get("total_volume", 0) or 0),
                    "liquidity": float(cg_data.get("total_volume", 0) or 0) * 0.1,  # Estimate
                    "marketCap": float(cg_data.get("market_cap", 0) or 0),
                    "holders": 0  # Not available from CoinGecko
                })
            
            # Filter out tokens with no price data
            tokens = [t for t in tokens if t["price"] > 0]
            
            # If no tokens have price, use fallback
            if not tokens:
                print("No CoinGecko price data available, using fallback")
                return self._get_fallback_tokens()[offset:offset+limit]
            
            # Sort tokens
            if sort_by == "volume":
                tokens.sort(key=lambda x: x["volume24h"], reverse=(sort_type == "desc"))
            elif sort_by == "price":
                tokens.sort(key=lambda x: x["price"], reverse=(sort_type == "desc"))
            elif sort_by == "change":
                tokens.sort(key=lambda x: x["priceChange24h"], reverse=(sort_type == "desc"))
            
            # Cache the result
            await cache.set_tokens(tokens)
            
            return tokens[offset:offset+limit]
                    
        except Exception as e:
            print(f"Token fetch error: {e}")
            return self._get_fallback_tokens()[offset:offset+limit]
    
    async def _get_coingecko_market_data(self, coingecko_ids: List[str]) -> Dict[str, Dict]:
        """Fetch market data from CoinGecko (FREE tier)."""
        await self.coingecko_limiter.acquire()
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.coingecko_url}/coins/markets",
                    params={
                        "vs_currency": "usd",
                        "ids": ",".join(coingecko_ids),
                        "order": "market_cap_desc",
                        "per_page": 100,
                        "page": 1,
                        "sparkline": False,
                        "price_change_percentage": "24h,7d"
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        item["id"]: {
                            "price": item.get("current_price", 0),
                            "market_cap": item.get("market_cap", 0),
                            "total_volume": item.get("total_volume", 0),
                            "price_change_percentage_24h": item.get("price_change_percentage_24h", 0),
                            "price_change_percentage_7d": item.get("price_change_percentage_7d_in_currency", 0)
                        }
                        for item in data
                    }
                else:
                    print(f"CoinGecko API error: {response.status_code}")
                    return {}
        except Exception as e:
            print(f"CoinGecko error: {e}")
            return {}
    
    # Keep get_birdeye_tokens as an alias for backward compatibility
    async def get_birdeye_tokens(
        self,
        sort_by: str = "v24hUSD",
        sort_type: str = "desc",
        offset: int = 0,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        DEPRECATED: Use get_solana_tokens instead.
        This method is kept for backward compatibility.
        """
        # Map old sort fields to new ones
        new_sort_by = "volume" if sort_by == "v24hUSD" else "price"
        return await self.get_solana_tokens(new_sort_by, sort_type, offset, limit)
    
    def _get_fallback_tokens(self) -> List[Dict[str, Any]]:
        """Get fallback token data when API fails."""
        return [
            {
                "symbol": "BONK",
                "name": "Bonk",
                "mintAddress": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
                "price": 0.00002341,
                "priceChange24h": 5.67,
                "priceChange7d": -12.34,
                "volume24h": 45000000,
                "liquidity": 8500000,
                "marketCap": 1450000000,
                "holders": 567890
            },
            {
                "symbol": "WIF",
                "name": "dogwifhat",
                "mintAddress": "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
                "price": 2.45,
                "priceChange24h": -3.21,
                "priceChange7d": 24.56,
                "volume24h": 120000000,
                "liquidity": 25000000,
                "marketCap": 2400000000,
                "holders": 234567
            },
            {
                "symbol": "POPCAT",
                "name": "Popcat",
                "mintAddress": "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
                "price": 0.89,
                "priceChange24h": 15.43,
                "priceChange7d": 45.67,
                "volume24h": 35000000,
                "liquidity": 12000000,
                "marketCap": 870000000,
                "holders": 123456
            },
            {
                "symbol": "MYRO",
                "name": "Myro",
                "mintAddress": "HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4",
                "price": 0.12,
                "priceChange24h": 8.90,
                "priceChange7d": -5.43,
                "volume24h": 18000000,
                "liquidity": 5600000,
                "marketCap": 120000000,
                "holders": 45678
            },
            {
                "symbol": "SAMO",
                "name": "Samoyedcoin",
                "mintAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
                "price": 0.0089,
                "priceChange24h": -2.15,
                "priceChange7d": 8.90,
                "volume24h": 5600000,
                "liquidity": 3200000,
                "marketCap": 35000000,
                "holders": 78901
            }
        ]
    
    async def get_token_info(self, address: str) -> Optional[Dict[str, Any]]:
        """
        Fetch token info using Jupiter Price API + CoinGecko.
        
        Args:
            address: Token mint address
        
        Returns:
            Token info dict
        """
        await self.jupiter_limiter.acquire()
        
        # Find token in our list
        token_info = None
        for symbol, info in self.SOLANA_MEME_TOKENS.items():
            if info["address"] == address:
                token_info = {"symbol": symbol, **info}
                break
        
        if not token_info:
            # Unknown token, return basic info from Jupiter
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.get(
                        f"{self.jupiter_price_url}/price",
                        params={"ids": address}
                    )
                    if response.status_code == 200:
                        data = response.json().get("data", {}).get(address, {})
                        return {
                            "address": address,
                            "symbol": data.get("mintSymbol", "UNKNOWN"),
                            "price": float(data.get("price", 0) or 0)
                        }
            except Exception as e:
                print(f"Jupiter price error: {e}")
            return None
        
        try:
            # Get price from Jupiter
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.jupiter_price_url}/price",
                    params={"ids": address}
                )
                
                price = 0
                if response.status_code == 200:
                    data = response.json().get("data", {}).get(address, {})
                    price = float(data.get("price", 0) or 0)
            
            # Get additional data from CoinGecko
            market_data = await self._get_coingecko_market_data([token_info["coingecko_id"]])
            cg_data = market_data.get(token_info["coingecko_id"], {})
            
            return {
                "address": address,
                "symbol": token_info["symbol"],
                "name": token_info["name"],
                "price": price,
                "priceChange24h": float(cg_data.get("price_change_percentage_24h", 0) or 0),
                "volume24h": float(cg_data.get("total_volume", 0) or 0),
                "marketCap": float(cg_data.get("market_cap", 0) or 0)
            }
                
        except Exception as e:
            print(f"Token info error: {e}")
            return None
    
    # Keep old method name as alias for backward compatibility
    async def get_birdeye_token_info(self, address: str) -> Optional[Dict[str, Any]]:
        """DEPRECATED: Use get_token_info instead."""
        return await self.get_token_info(address)
    
    async def get_solana_ohlcv(
        self,
        address: str,
        interval: str = "1H",
        time_from: Optional[int] = None,
        time_to: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Fetch OHLCV data for a Solana token using CoinGecko.
        Note: CoinGecko provides market chart data instead of raw OHLCV.
        
        Args:
            address: Token mint address
            interval: Timeframe (1m, 5m, 15m, 1H, 4H, 1D, 1W)
            time_from: Start timestamp
            time_to: End timestamp
        
        Returns:
            List of OHLCV data
        """
        # Find token's CoinGecko ID
        coingecko_id = None
        for symbol, info in self.SOLANA_MEME_TOKENS.items():
            if info["address"] == address:
                coingecko_id = info["coingecko_id"]
                break
        
        if not coingecko_id:
            print(f"Token {address} not found in our list")
            return []
        
        await self.coingecko_limiter.acquire()
        
        # Map interval to CoinGecko days
        interval_to_days = {
            "1m": 1, "5m": 1, "15m": 1,
            "1H": 1, "4H": 7, "1D": 30, "1W": 90
        }
        days = interval_to_days.get(interval, 7)
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.coingecko_url}/coins/{coingecko_id}/ohlc",
                    params={"vs_currency": "usd", "days": days}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    # CoinGecko OHLC format: [timestamp, open, high, low, close]
                    return [
                        {
                            "timestamp": int(item[0]),
                            "open": float(item[1]),
                            "high": float(item[2]),
                            "low": float(item[3]),
                            "close": float(item[4]),
                            "volume": 0  # Not provided by CoinGecko OHLC
                        }
                        for item in data
                    ]
                return []
                
        except Exception as e:
            print(f"CoinGecko OHLCV error: {e}")
            return []
    
    # Keep old method name as alias for backward compatibility
    async def get_birdeye_ohlcv(
        self,
        address: str,
        interval: str = "1H",
        time_from: Optional[int] = None,
        time_to: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """DEPRECATED: Use get_solana_ohlcv instead."""
        return await self.get_solana_ohlcv(address, interval, time_from, time_to)
    
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
