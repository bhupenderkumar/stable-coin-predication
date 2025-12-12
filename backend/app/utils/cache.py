"""
Redis caching utility for API responses.
"""

import json
import hashlib
from typing import Any, Optional
from datetime import timedelta
import redis.asyncio as redis

from app.config import settings


class CacheManager:
    """Redis cache manager for API response caching."""
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.default_ttl = settings.cache_ttl_seconds
        self._enabled = True
    
    async def connect(self):
        """Establish Redis connection."""
        try:
            self.redis_client = redis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            # Test connection
            await self.redis_client.ping()
            self._enabled = True
        except Exception as e:
            print(f"Redis connection failed: {e}. Running without cache.")
            self._enabled = False
            self.redis_client = None
    
    async def disconnect(self):
        """Close Redis connection."""
        if self.redis_client:
            await self.redis_client.close()
    
    def _generate_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate a cache key from prefix and arguments."""
        key_data = f"{prefix}:{':'.join(str(a) for a in args)}"
        if kwargs:
            key_data += f":{json.dumps(kwargs, sort_keys=True)}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.
        
        Args:
            key: Cache key
        
        Returns:
            Cached value or None
        """
        if not self._enabled or not self.redis_client:
            return None
        
        try:
            value = await self.redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            print(f"Cache get error: {e}")
            return None
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None
    ) -> bool:
        """
        Set value in cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds
        
        Returns:
            True if successful
        """
        if not self._enabled or not self.redis_client:
            return False
        
        try:
            ttl = ttl or self.default_ttl
            await self.redis_client.set(
                key,
                json.dumps(value),
                ex=ttl
            )
            return True
        except Exception as e:
            print(f"Cache set error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache."""
        if not self._enabled or not self.redis_client:
            return False
        
        try:
            await self.redis_client.delete(key)
            return True
        except Exception as e:
            print(f"Cache delete error: {e}")
            return False
    
    async def clear_pattern(self, pattern: str) -> int:
        """Clear all keys matching pattern."""
        if not self._enabled or not self.redis_client:
            return 0
        
        try:
            keys = await self.redis_client.keys(pattern)
            if keys:
                return await self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            print(f"Cache clear error: {e}")
            return 0
    
    # Convenience methods for specific data types
    async def get_tokens(self) -> Optional[list]:
        """Get cached token list."""
        return await self.get("tokens:list")
    
    async def set_tokens(self, tokens: list, ttl: int = 60) -> bool:
        """Cache token list."""
        return await self.set("tokens:list", tokens, ttl)
    
    async def get_ohlcv(self, symbol: str, interval: str) -> Optional[list]:
        """Get cached OHLCV data."""
        key = f"ohlcv:{symbol}:{interval}"
        return await self.get(key)
    
    async def set_ohlcv(
        self,
        symbol: str,
        interval: str,
        data: list,
        ttl: int = 60
    ) -> bool:
        """Cache OHLCV data."""
        key = f"ohlcv:{symbol}:{interval}"
        return await self.set(key, data, ttl)
    
    async def get_quote(self, input_mint: str, output_mint: str, amount: int) -> Optional[dict]:
        """Get cached Jupiter quote."""
        key = f"quote:{input_mint}:{output_mint}:{amount}"
        return await self.get(key)
    
    async def set_quote(
        self,
        input_mint: str,
        output_mint: str,
        amount: int,
        data: dict,
        ttl: int = 10  # Short TTL for quotes
    ) -> bool:
        """Cache Jupiter quote."""
        key = f"quote:{input_mint}:{output_mint}:{amount}"
        return await self.set(key, data, ttl)


# Global cache instance
cache = CacheManager()
