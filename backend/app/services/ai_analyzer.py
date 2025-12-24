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
from app.services.prompts import PromptBuilder
from app.services.confidence import ConfidenceScorer
from app.services.risk import RiskAssessor
from app.utils.indicators import calculate_rsi, calculate_macd, calculate_bollinger_bands


class AIAnalyzer:
    """
    AI-powered market analyzer using Groq/Llama 3.1.
    Provides BUY/NO_BUY/SELL recommendations with confidence scores.
    """
    
    def __init__(self):
        self.api_key = settings.groq_api_key
        self.model = "llama-3.3-70b-versatile"
        self._client = None
        
        # Initialize helper components
        self.prompt_builder = PromptBuilder()
        self.confidence_scorer = ConfidenceScorer()
        self.risk_assessor = RiskAssessor()
    
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
        if rsi < 40 and volume_trend == "INCREASING":
            decision = "BUY"
            confidence = 75
            reasoning = "RSI indicates oversold conditions with increasing volume, suggesting potential reversal."
            risk_level = "MEDIUM"
        elif rsi > 60:
            decision = "SELL"
            confidence = 70
            reasoning = "RSI indicates overbought conditions. Consider taking profits."
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
    
    def _calculate_indicators(
        self,
        closes: List[float],
        highs: List[float],
        lows: List[float],
        volumes: List[float]
    ) -> Dict[str, Any]:
        """
        Calculate technical indicators from OHLCV data.
        
        Args:
            closes: List of closing prices
            highs: List of high prices
            lows: List of low prices
            volumes: List of volumes
            
        Returns:
            Dictionary with calculated indicators
        """
        indicators = {}
        
        # Calculate RSI - returns list, get latest value
        if len(closes) >= 14:
            rsi_list = calculate_rsi(closes)
            indicators['rsi'] = rsi_list[-1] if rsi_list else 50.0
        else:
            indicators['rsi'] = 50.0
        
        # Calculate MACD - returns dict of lists, get latest values
        if len(closes) >= 26:
            macd_data = calculate_macd(closes)
            indicators['macd'] = {
                'macd': macd_data['macd'][-1] if macd_data['macd'] else 0,
                'signal': macd_data['signal'][-1] if macd_data['signal'] else 0,
                'histogram': macd_data['histogram'][-1] if macd_data['histogram'] else 0
            }
        else:
            indicators['macd'] = {'macd': 0, 'signal': 0, 'histogram': 0}
        
        # Calculate Bollinger Bands - returns dict of lists, get latest values
        if len(closes) >= 20:
            bb_data = calculate_bollinger_bands(closes)
            indicators['bollinger'] = {
                'upper': bb_data['upper'][-1] if bb_data['upper'] else 0,
                'middle': bb_data['middle'][-1] if bb_data['middle'] else 0,
                'lower': bb_data['lower'][-1] if bb_data['lower'] else 0
            }
        else:
            indicators['bollinger'] = {'upper': 0, 'middle': 0, 'lower': 0}
        
        # Calculate volume trend
        if len(volumes) >= 10:
            recent_vol = sum(volumes[-5:]) / 5
            older_vol = sum(volumes[-10:-5]) / 5
            if recent_vol > older_vol * 1.1:
                indicators['volume_trend'] = 'INCREASING'
            elif recent_vol < older_vol * 0.9:
                indicators['volume_trend'] = 'DECREASING'
            else:
                indicators['volume_trend'] = 'STABLE'
        else:
            indicators['volume_trend'] = 'STABLE'
        
        return indicators
    
    def _parse_llm_response(self, response: str) -> Dict[str, Any]:
        """
        Parse LLM response into structured format.
        
        Args:
            response: Raw LLM response string
            
        Returns:
            Parsed dictionary with decision, confidence, reasoning
        """
        try:
            # Try to parse as JSON
            parsed = json.loads(response.strip())
            
            # Ensure required fields exist
            if 'decision' not in parsed:
                parsed['decision'] = 'NO_BUY'
            if 'confidence' not in parsed:
                parsed['confidence'] = 50
            if 'reasoning' not in parsed:
                parsed['reasoning'] = 'Unable to parse reasoning'
            
            return parsed
            
        except json.JSONDecodeError:
            # Try to extract JSON from the response
            import re
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except json.JSONDecodeError:
                    pass
            
            # Return default fallback response
            return {
                'decision': 'NO_BUY',
                'confidence': 30,
                'reasoning': 'Failed to parse LLM response',
                'risk_factors': ['parsing_error']
            }
    
    def _fallback_analysis(
        self,
        symbol: str,
        token_data: Any,
        indicators: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Fallback rule-based analysis when LLM is unavailable.
        
        Args:
            symbol: Token symbol
            token_data: Token data object
            indicators: Technical indicators
            
        Returns:
            Analysis result dictionary
        """
        rsi = indicators.get('rsi', 50)
        volume_trend = indicators.get('volume_trend', 'STABLE')
        macd = indicators.get('macd', {})
        macd_histogram = macd.get('histogram', 0) if isinstance(macd, dict) else 0
        
        # Rule-based decision
        decision = 'NO_BUY'
        confidence = 50
        reasoning = 'Neutral market conditions'
        risk_factors = []
        
        # Oversold conditions with bullish momentum
        if rsi < 30:
            if volume_trend == 'INCREASING' or macd_histogram > 0:
                decision = 'BUY'
                confidence = 70 + (30 - rsi)
                reasoning = f'Oversold RSI ({rsi:.1f}) with bullish signals. Good entry opportunity.'
            else:
                decision = 'NO_BUY'
                confidence = 55
                reasoning = f'Oversold RSI ({rsi:.1f}) but waiting for volume confirmation.'
                risk_factors.append('weak_volume')
        
        # Overbought conditions
        elif rsi > 70:
            decision = 'SELL'
            confidence = 65 + (rsi - 70)
            reasoning = f'Overbought RSI ({rsi:.1f}). Consider taking profits.'
            risk_factors.append('overbought')
        
        # MACD bullish crossover
        elif macd_histogram > 0 and volume_trend == 'INCREASING':
            decision = 'BUY'
            confidence = 60
            reasoning = 'Bullish MACD with increasing volume momentum.'
        
        # MACD bearish
        elif macd_histogram < 0 and volume_trend == 'DECREASING':
            decision = 'NO_BUY'
            confidence = 55
            reasoning = 'Bearish MACD with declining volume. Wait for reversal.'
            risk_factors.append('bearish_momentum')
        
        # Cap confidence at 100
        confidence = min(confidence, 100)
        
        return {
            'analysisId': str(uuid.uuid4()),
            'symbol': symbol,
            'decision': decision,
            'confidence': confidence,
            'reasoning': reasoning,
            'risk_factors': risk_factors,
            'riskLevel': 'HIGH' if rsi > 70 or rsi < 30 else 'MEDIUM',
            'indicators': indicators,
            'timestamp': datetime.utcnow().isoformat()
        }


# Global AI analyzer instance
ai_analyzer = AIAnalyzer()


def get_ai_analyzer() -> AIAnalyzer:
    """Get the global AI analyzer instance (for dependency injection)."""
    return ai_analyzer
