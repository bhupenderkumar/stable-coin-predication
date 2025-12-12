"""
Prompt Builder for AI Trading Analysis.
Constructs structured prompts for LLM-powered market analysis.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime


class PromptBuilder:
    """
    Builds prompts for AI trading analysis.
    
    Designed to generate consistent, structured responses from LLMs
    for trading decisions on Solana meme coins.
    """
    
    SYSTEM_PROMPT = """You are an expert cryptocurrency trading analyst specializing in Solana meme coins. 
Your role is to analyze token data and technical indicators to provide trading recommendations.

IMPORTANT RULES:
1. Always respond in valid JSON format
2. Be conservative - protect capital is priority #1
3. Consider liquidity and volume when making decisions
4. Factor in meme coin volatility and risk
5. Never recommend buying tokens with very low liquidity (<$50k)
6. Consider RSI overbought/oversold levels carefully

Your response MUST be a valid JSON object with this exact structure:
{
    "decision": "BUY" | "SELL" | "NO_BUY" | "HOLD",
    "confidence": <number 0-100>,
    "reasoning": "<detailed explanation of your decision>",
    "risk_factors": ["<risk 1>", "<risk 2>", ...]
}

Decision Guidelines:
- BUY: Strong bullish signals with acceptable risk
- SELL: Strong bearish signals or take-profit opportunity  
- NO_BUY: Avoid entry - unfavorable conditions or high risk
- HOLD: Neutral - wait for better entry/exit

Confidence Guidelines:
- 80-100: Very strong signals, multiple confirmations
- 60-79: Moderate signals with some confirmation
- 40-59: Mixed signals, uncertain
- 0-39: Weak signals or high risk"""

    def get_system_prompt(self) -> str:
        """Return the system prompt for LLM initialization."""
        return self.SYSTEM_PROMPT
    
    def build_analysis_prompt(
        self,
        symbol: str,
        token_data: Any,
        indicators: Dict[str, Any],
        ohlcv_data: Optional[List[Any]] = None
    ) -> str:
        """
        Build a comprehensive analysis prompt for a single token.
        
        Args:
            symbol: Token symbol
            token_data: Token metrics (price, volume, liquidity, etc.)
            indicators: Calculated technical indicators
            ohlcv_data: Recent OHLCV candles for context
        
        Returns:
            Formatted prompt string
        """
        prompt_parts = []
        
        # Header
        prompt_parts.append(f"## TRADING ANALYSIS REQUEST: {symbol}")
        prompt_parts.append(f"Timestamp: {datetime.utcnow().isoformat()}")
        prompt_parts.append("")
        
        # Token Metrics Section
        prompt_parts.append("### TOKEN METRICS")
        if token_data:
            prompt_parts.append(f"- Symbol: {symbol}")
            prompt_parts.append(f"- Current Price: ${getattr(token_data, 'price', 'N/A')}")
            prompt_parts.append(f"- 24h Price Change: {getattr(token_data, 'price_change_24h', 'N/A')}%")
            prompt_parts.append(f"- 7d Price Change: {getattr(token_data, 'price_change_7d', 'N/A')}%")
            prompt_parts.append(f"- 24h Volume: ${getattr(token_data, 'volume_24h', 'N/A'):,.0f}" if hasattr(token_data, 'volume_24h') and token_data.volume_24h else "- 24h Volume: N/A")
            prompt_parts.append(f"- Liquidity: ${getattr(token_data, 'liquidity', 'N/A'):,.0f}" if hasattr(token_data, 'liquidity') and token_data.liquidity else "- Liquidity: N/A")
            prompt_parts.append(f"- Market Cap: ${getattr(token_data, 'market_cap', 'N/A'):,.0f}" if hasattr(token_data, 'market_cap') and token_data.market_cap else "- Market Cap: N/A")
            prompt_parts.append(f"- Holders: {getattr(token_data, 'holders', 'N/A'):,}" if hasattr(token_data, 'holders') and token_data.holders else "- Holders: N/A")
        prompt_parts.append("")
        
        # Technical Indicators Section
        prompt_parts.append("### TECHNICAL INDICATORS")
        
        # RSI
        rsi = indicators.get('rsi')
        if rsi:
            rsi_status = "OVERBOUGHT" if rsi > 70 else "OVERSOLD" if rsi < 30 else "NEUTRAL"
            prompt_parts.append(f"- RSI (14): {rsi:.2f} [{rsi_status}]")
        
        # MACD
        macd = indicators.get('macd', {})
        if macd:
            macd_signal = "BULLISH" if macd.get('histogram', 0) > 0 else "BEARISH"
            prompt_parts.append(f"- MACD Line: {macd.get('macd', 0):.6f}")
            prompt_parts.append(f"- MACD Signal: {macd.get('signal', 0):.6f}")
            prompt_parts.append(f"- MACD Histogram: {macd.get('histogram', 0):.6f} [{macd_signal}]")
        
        # Bollinger Bands
        bb = indicators.get('bollinger', {})
        if bb and token_data:
            current_price = getattr(token_data, 'price', 0)
            if current_price and bb.get('upper') and bb.get('lower'):
                bb_position = "UPPER" if current_price >= bb.get('upper', 0) else \
                             "LOWER" if current_price <= bb.get('lower', 0) else "MIDDLE"
                prompt_parts.append(f"- BB Upper: ${bb.get('upper', 0):.8f}")
                prompt_parts.append(f"- BB Middle: ${bb.get('middle', 0):.8f}")
                prompt_parts.append(f"- BB Lower: ${bb.get('lower', 0):.8f}")
                prompt_parts.append(f"- Price Position: {bb_position}")
        
        # Volume Trend
        volume_trend = indicators.get('volume_trend', 'STABLE')
        prompt_parts.append(f"- Volume Trend: {volume_trend}")
        
        # Support/Resistance
        support = indicators.get('support')
        resistance = indicators.get('resistance')
        if support:
            prompt_parts.append(f"- Support Level: ${support:.8f}")
        if resistance:
            prompt_parts.append(f"- Resistance Level: ${resistance:.8f}")
        
        # Price Action Summary
        price_action = indicators.get('price_action', 'Unknown')
        prompt_parts.append(f"- Price Action: {price_action}")
        prompt_parts.append("")
        
        # Recent Price History
        if ohlcv_data and len(ohlcv_data) > 0:
            prompt_parts.append("### RECENT PRICE HISTORY (Last 6 Candles)")
            for i, candle in enumerate(ohlcv_data[-6:]):
                prompt_parts.append(
                    f"  {i+1}. O: ${getattr(candle, 'open', 0):.8f} | "
                    f"H: ${getattr(candle, 'high', 0):.8f} | "
                    f"L: ${getattr(candle, 'low', 0):.8f} | "
                    f"C: ${getattr(candle, 'close', 0):.8f} | "
                    f"V: {getattr(candle, 'volume', 0):,.0f}"
                )
            prompt_parts.append("")
        
        # Analysis Request
        prompt_parts.append("### ANALYSIS REQUEST")
        prompt_parts.append("Based on the above data, provide your trading recommendation.")
        prompt_parts.append("Consider:")
        prompt_parts.append("1. Is the current price a good entry point?")
        prompt_parts.append("2. What are the key risks?")
        prompt_parts.append("3. What is your confidence level in this analysis?")
        prompt_parts.append("")
        prompt_parts.append("Respond with a JSON object containing: decision, confidence, reasoning, risk_factors")
        
        return "\n".join(prompt_parts)
    
    def build_batch_analysis_prompt(
        self,
        tokens: List[Dict[str, Any]],
        top_n: int = 5
    ) -> str:
        """
        Build a prompt for analyzing multiple tokens and ranking them.
        
        Args:
            tokens: List of token data dictionaries
            top_n: Number of top recommendations to return
        
        Returns:
            Formatted prompt string
        """
        prompt_parts = []
        
        prompt_parts.append(f"## BATCH TOKEN ANALYSIS REQUEST")
        prompt_parts.append(f"Analyze the following {len(tokens)} tokens and rank the top {top_n} buying opportunities.")
        prompt_parts.append("")
        
        for i, token in enumerate(tokens, 1):
            prompt_parts.append(f"### Token {i}: {token.get('symbol', 'UNKNOWN')}")
            prompt_parts.append(f"- Price: ${token.get('price', 0):.8f}")
            prompt_parts.append(f"- 24h Change: {token.get('price_change_24h', 0)}%")
            prompt_parts.append(f"- Volume: ${token.get('volume_24h', 0):,.0f}")
            prompt_parts.append(f"- Liquidity: ${token.get('liquidity', 0):,.0f}")
            prompt_parts.append(f"- RSI: {token.get('rsi', 50):.1f}")
            prompt_parts.append("")
        
        prompt_parts.append("### RESPONSE FORMAT")
        prompt_parts.append("Return a JSON object with:")
        prompt_parts.append('{')
        prompt_parts.append('  "rankings": [')
        prompt_parts.append('    {"symbol": "TOKEN1", "rank": 1, "decision": "BUY", "confidence": 85, "reasoning": "..."},')
        prompt_parts.append('    ...')
        prompt_parts.append('  ]')
        prompt_parts.append('}')
        
        return "\n".join(prompt_parts)
    
    def build_risk_assessment_prompt(
        self,
        symbol: str,
        token_data: Any,
        position_size: float
    ) -> str:
        """
        Build a prompt for risk assessment of a potential trade.
        
        Args:
            symbol: Token symbol
            token_data: Token metrics
            position_size: Proposed position size in USD
        
        Returns:
            Formatted prompt string
        """
        prompt_parts = []
        
        prompt_parts.append(f"## RISK ASSESSMENT REQUEST: {symbol}")
        prompt_parts.append(f"Proposed Position Size: ${position_size:,.2f}")
        prompt_parts.append("")
        
        prompt_parts.append("### TOKEN DATA")
        prompt_parts.append(f"- Liquidity: ${getattr(token_data, 'liquidity', 0):,.0f}")
        prompt_parts.append(f"- 24h Volume: ${getattr(token_data, 'volume_24h', 0):,.0f}")
        prompt_parts.append(f"- Market Cap: ${getattr(token_data, 'market_cap', 0):,.0f}")
        prompt_parts.append(f"- Holders: {getattr(token_data, 'holders', 0):,}")
        prompt_parts.append("")
        
        prompt_parts.append("### ASSESSMENT REQUEST")
        prompt_parts.append("Evaluate the risk of this trade and provide:")
        prompt_parts.append('{')
        prompt_parts.append('  "risk_level": "LOW" | "MEDIUM" | "HIGH",')
        prompt_parts.append('  "max_recommended_position": <number>,')
        prompt_parts.append('  "slippage_estimate": <percentage>,')
        prompt_parts.append('  "risk_factors": ["factor1", "factor2", ...],')
        prompt_parts.append('  "recommendation": "PROCEED" | "REDUCE_SIZE" | "AVOID"')
        prompt_parts.append('}')
        
        return "\n".join(prompt_parts)
    
    def build_market_sentiment_prompt(
        self,
        tokens: List[Dict[str, Any]]
    ) -> str:
        """
        Build a prompt for overall market sentiment analysis.
        
        Args:
            tokens: List of trending token data
        
        Returns:
            Formatted prompt string
        """
        prompt_parts = []
        
        prompt_parts.append("## MARKET SENTIMENT ANALYSIS")
        prompt_parts.append(f"Analyze market sentiment based on {len(tokens)} trending tokens.")
        prompt_parts.append("")
        
        # Calculate aggregate metrics
        avg_change = sum(t.get('price_change_24h', 0) for t in tokens) / len(tokens) if tokens else 0
        up_count = sum(1 for t in tokens if t.get('price_change_24h', 0) > 0)
        down_count = len(tokens) - up_count
        
        prompt_parts.append("### AGGREGATE METRICS")
        prompt_parts.append(f"- Average 24h Change: {avg_change:.2f}%")
        prompt_parts.append(f"- Tokens Up: {up_count}")
        prompt_parts.append(f"- Tokens Down: {down_count}")
        prompt_parts.append("")
        
        prompt_parts.append("### RESPONSE FORMAT")
        prompt_parts.append('{')
        prompt_parts.append('  "overall_sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",')
        prompt_parts.append('  "sentiment_score": <number -100 to 100>,')
        prompt_parts.append('  "market_phase": "ACCUMULATION" | "MARKUP" | "DISTRIBUTION" | "MARKDOWN",')
        prompt_parts.append('  "recommendation": "AGGRESSIVE" | "MODERATE" | "DEFENSIVE",')
        prompt_parts.append('  "analysis": "<detailed market analysis>"')
        prompt_parts.append('}')
        
        return "\n".join(prompt_parts)
