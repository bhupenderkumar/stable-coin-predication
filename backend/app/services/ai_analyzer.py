"""
AI Analyzer Service - LLM Integration for Trading Decisions

This service integrates with Groq API (Llama 3.1) for AI-powered
market analysis and trading recommendations.

Agent 3 Responsibility, but basic structure for integration.
"""

import os
import json
import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime

from app.config import settings


class AIAnalyzer:
    """
    AI-powered market analyzer using Groq/Llama 3.1.
    Provides BUY/NO_BUY/SELL recommendations with confidence scores.
    """
    
    def __init__(self):
        self.api_key = settings.groq_api_key
        self.model = "llama-3.1-70b-versatile"
        self._client = None
    
    def _get_client(self):
        """Lazy initialization of Groq client."""
        if self._client is None and self.api_key:
            try:
                from groq import Groq
                self._client = Groq(api_key=self.api_key)
            except ImportError:
                print("Groq package not installed")
                return None
        return self._client
    
    async def analyze_token(
        self,
        symbol: str,
        token_data: Dict[str, Any],
        ohlcv: List[Dict[str, Any]],
        indicators: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Analyze a token and provide trading recommendation.
        
        Args:
            symbol: Token symbol
            token_data: Current token info (price, volume, etc.)
            ohlcv: Historical OHLCV data
            indicators: Technical indicators (RSI, volume trend, etc.)
        
        Returns:
            Analysis result with decision, confidence, and reasoning
        """
        # If no API key, return mock analysis
        if not self.api_key:
            return self._generate_mock_analysis(symbol, indicators)
        
        client = self._get_client()
        if not client:
            return self._generate_mock_analysis(symbol, indicators)
        
        # Build the analysis prompt
        prompt = self._build_analysis_prompt(symbol, token_data, ohlcv, indicators)
        
        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": self._get_system_prompt()
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_tokens=1024,
                response_format={"type": "json_object"}
            )
            
            # Parse the response
            result = json.loads(response.choices[0].message.content)
            result["analysisId"] = str(uuid.uuid4())
            result["symbol"] = symbol
            result["modelUsed"] = self.model
            result["timestamp"] = datetime.utcnow().isoformat()
            
            return result
            
        except Exception as e:
            print(f"AI analysis error: {e}")
            return self._generate_mock_analysis(symbol, indicators)
    
    def _get_system_prompt(self) -> str:
        """Get the system prompt for the AI model."""
        return """You are an expert cryptocurrency trading analyst specializing in meme coins on Solana.
        
Your task is to analyze token data and provide a trading recommendation. You must respond with a JSON object containing:

{
    "decision": "BUY" | "NO_BUY" | "SELL",
    "confidence": <number 0-100>,
    "reasoning": "<2-3 sentence explanation>",
    "riskLevel": "LOW" | "MEDIUM" | "HIGH",
    "indicators": {
        "rsi": <number>,
        "volumeTrend": "INCREASING" | "DECREASING" | "STABLE",
        "priceAction": "<brief description>"
    },
    "entryPrice": <suggested entry price or null>,
    "targetPrice": <suggested target price or null>,
    "stopLoss": <suggested stop loss or null>
}

Consider these factors:
1. RSI levels (oversold < 30, overbought > 70)
2. Volume trends (increasing volume = stronger move)
3. Price action patterns
4. Liquidity for position sizing
5. Market conditions for meme coins

Be conservative with BUY signals. Only recommend BUY when multiple indicators align positively."""
    
    def _build_analysis_prompt(
        self,
        symbol: str,
        token_data: Dict[str, Any],
        ohlcv: List[Dict[str, Any]],
        indicators: Dict[str, Any]
    ) -> str:
        """Build the analysis prompt with token data."""
        # Get recent price changes
        if len(ohlcv) >= 2:
            recent_prices = [c["close"] for c in ohlcv[-24:]]
            price_change_24h = ((recent_prices[-1] - recent_prices[0]) / recent_prices[0]) * 100 if recent_prices[0] != 0 else 0
        else:
            price_change_24h = 0
        
        return f"""Analyze the following token for trading opportunity:

**Token:** {symbol}
**Current Price:** ${token_data.get('price', 0):.8f}
**24h Price Change:** {price_change_24h:.2f}%
**24h Volume:** ${token_data.get('volume24h', 0):,.0f}
**Liquidity:** ${token_data.get('liquidity', 0):,.0f}
**Market Cap:** ${token_data.get('marketCap', 0):,.0f}

**Technical Indicators:**
- RSI (14): {indicators.get('rsi', 50):.1f}
- Volume Trend: {indicators.get('volumeTrend', 'STABLE')}
- SMA 20: ${indicators.get('sma20', 0):.8f}
- Support Level: ${indicators.get('support', 0):.8f}
- Resistance Level: ${indicators.get('resistance', 0):.8f}
- MACD: {indicators.get('macd', {}).get('value', 0):.6f}
- MACD Signal: {indicators.get('macd', {}).get('signal', 0):.6f}

**Recent Price Action:** {indicators.get('priceAction', 'N/A')}

Provide your trading analysis and recommendation."""
    
    def _generate_mock_analysis(
        self,
        symbol: str,
        indicators: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate a mock analysis when API is unavailable."""
        rsi = indicators.get("rsi", 50)
        volume_trend = indicators.get("volumeTrend", "STABLE")
        
        # Simple rule-based mock analysis
        if rsi < 30 and volume_trend == "INCREASING":
            decision = "BUY"
            confidence = 75
            reasoning = "RSI indicates oversold conditions with increasing volume, suggesting potential reversal."
            risk_level = "MEDIUM"
        elif rsi > 70:
            decision = "NO_BUY"
            confidence = 70
            reasoning = "RSI indicates overbought conditions. Wait for pullback to better entry."
            risk_level = "HIGH"
        elif volume_trend == "DECREASING":
            decision = "NO_BUY"
            confidence = 60
            reasoning = "Declining volume suggests weakening momentum. Not ideal for entry."
            risk_level = "MEDIUM"
        else:
            decision = "NO_BUY"
            confidence = 50
            reasoning = "No clear trading signal. Neutral market conditions."
            risk_level = "LOW"
        
        return {
            "analysisId": str(uuid.uuid4()),
            "symbol": symbol,
            "decision": decision,
            "confidence": confidence,
            "reasoning": reasoning,
            "riskLevel": risk_level,
            "indicators": {
                "rsi": rsi,
                "volumeTrend": volume_trend,
                "priceAction": indicators.get("priceAction", "Consolidating")
            },
            "entryPrice": None,
            "targetPrice": None,
            "stopLoss": None,
            "modelUsed": "mock-analyzer",
            "timestamp": datetime.utcnow().isoformat()
        }


# Global AI analyzer instance
ai_analyzer = AIAnalyzer()


def get_ai_analyzer() -> AIAnalyzer:
    """Get the global AI analyzer instance (for dependency injection)."""
    return ai_analyzer
