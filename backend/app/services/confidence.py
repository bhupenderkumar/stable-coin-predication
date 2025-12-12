"""
Confidence Scoring Algorithm for Trading Decisions.
Combines LLM confidence with technical indicator signals for robust scoring.
"""

from typing import Dict, Any, Optional


class ConfidenceScorer:
    """
    Calculates trading confidence scores by combining multiple signals.
    
    The final confidence score is a weighted combination of:
    - LLM confidence (40%)
    - Technical indicator signals (35%)
    - Token fundamentals (25%)
    """
    
    # Weights for different signal sources
    WEIGHT_LLM = 0.40
    WEIGHT_INDICATORS = 0.35
    WEIGHT_FUNDAMENTALS = 0.25
    
    # RSI thresholds
    RSI_OVERSOLD = 30
    RSI_OVERBOUGHT = 70
    RSI_NEUTRAL_LOW = 40
    RSI_NEUTRAL_HIGH = 60
    
    # Volume thresholds
    MIN_DAILY_VOLUME = 100000  # $100k minimum for reliable signals
    GOOD_DAILY_VOLUME = 1000000  # $1M+ is ideal
    
    # Liquidity thresholds
    MIN_LIQUIDITY = 50000  # $50k minimum
    GOOD_LIQUIDITY = 500000  # $500k+ is ideal
    
    def calculate(
        self,
        llm_confidence: float,
        indicators: Dict[str, Any],
        token_data: Any,
        volume_trend: str
    ) -> float:
        """
        Calculate final confidence score.
        
        Args:
            llm_confidence: Raw confidence from LLM (0-100)
            indicators: Dictionary of technical indicators
            token_data: Token metrics data
            volume_trend: Volume trend string
        
        Returns:
            Final confidence score (0-100)
        """
        # Calculate component scores
        indicator_score = self._calculate_indicator_score(indicators, volume_trend)
        fundamental_score = self._calculate_fundamental_score(token_data)
        
        # Normalize LLM confidence
        llm_score = max(0, min(100, llm_confidence))
        
        # Calculate weighted average
        final_score = (
            llm_score * self.WEIGHT_LLM +
            indicator_score * self.WEIGHT_INDICATORS +
            fundamental_score * self.WEIGHT_FUNDAMENTALS
        )
        
        # Apply penalty for very low fundamentals
        if fundamental_score < 30:
            final_score *= 0.8  # 20% penalty
        
        # Apply bonus for strong indicator alignment
        if indicator_score > 70 and llm_score > 70:
            final_score = min(100, final_score * 1.1)  # 10% bonus
        
        return round(max(0, min(100, final_score)), 1)
    
    def _calculate_indicator_score(
        self,
        indicators: Dict[str, Any],
        volume_trend: str
    ) -> float:
        """Calculate score based on technical indicators."""
        score = 50  # Start neutral
        
        # RSI component (±20 points)
        rsi = indicators.get('rsi', 50)
        if rsi < self.RSI_OVERSOLD:
            # Oversold - potential buying opportunity
            score += 20
        elif rsi < self.RSI_NEUTRAL_LOW:
            score += 10
        elif rsi > self.RSI_OVERBOUGHT:
            # Overbought - risky to buy
            score -= 15
        elif rsi > self.RSI_NEUTRAL_HIGH:
            score -= 5
        
        # MACD component (±15 points)
        macd = indicators.get('macd', {})
        if macd:
            histogram = macd.get('histogram', 0)
            macd_line = macd.get('macd', 0)
            signal_line = macd.get('signal', 0)
            
            if histogram > 0 and macd_line > signal_line:
                # Bullish MACD
                score += 15
            elif histogram < 0 and macd_line < signal_line:
                # Bearish MACD
                score -= 10
            elif histogram > 0:
                # Weakly bullish
                score += 5
        
        # Volume trend component (±10 points)
        if volume_trend == 'INCREASING':
            score += 10
        elif volume_trend == 'DECREASING':
            score -= 10
        
        # Bollinger Bands component (±10 points)
        bb = indicators.get('bollinger', {})
        if bb:
            # Price near lower band is potentially bullish
            # Price near upper band is potentially overbought
            pass  # Would need current price to calculate
        
        # Support/Resistance component (±5 points)
        support = indicators.get('support')
        resistance = indicators.get('resistance')
        if support and resistance and resistance > support:
            # Price closer to support is potentially better entry
            pass  # Would need current price to calculate
        
        return max(0, min(100, score))
    
    def _calculate_fundamental_score(self, token_data: Any) -> float:
        """Calculate score based on token fundamentals."""
        if not token_data:
            return 50  # Neutral if no data
        
        score = 50  # Start neutral
        
        # Liquidity component (±20 points)
        liquidity = getattr(token_data, 'liquidity', 0) or 0
        if liquidity >= self.GOOD_LIQUIDITY:
            score += 20
        elif liquidity >= self.MIN_LIQUIDITY:
            score += 10
        elif liquidity < self.MIN_LIQUIDITY:
            score -= 20  # Significant penalty for low liquidity
        
        # Volume component (±15 points)
        volume = getattr(token_data, 'volume_24h', 0) or 0
        if volume >= self.GOOD_DAILY_VOLUME:
            score += 15
        elif volume >= self.MIN_DAILY_VOLUME:
            score += 8
        elif volume < self.MIN_DAILY_VOLUME:
            score -= 15  # Penalty for low volume
        
        # Price momentum component (±10 points)
        price_change_24h = getattr(token_data, 'price_change_24h', 0) or 0
        price_change_7d = getattr(token_data, 'price_change_7d', 0) or 0
        
        # Favor moderate positive momentum
        if 5 <= price_change_24h <= 30:
            score += 5
        elif price_change_24h > 50:
            score -= 5  # Too much pump, risky
        elif price_change_24h < -20:
            score -= 10  # Significant decline
        
        # 7-day momentum
        if 10 <= price_change_7d <= 50:
            score += 5
        elif price_change_7d > 100:
            score -= 5  # May be overextended
        
        # Holder count component (±5 points)
        holders = getattr(token_data, 'holders', 0) or 0
        if holders >= 10000:
            score += 5
        elif holders >= 1000:
            score += 2
        elif holders < 500:
            score -= 5  # Low holder count is risky
        
        return max(0, min(100, score))
    
    def get_confidence_breakdown(
        self,
        llm_confidence: float,
        indicators: Dict[str, Any],
        token_data: Any,
        volume_trend: str
    ) -> Dict[str, Any]:
        """
        Get detailed breakdown of confidence score components.
        
        Useful for debugging and transparency.
        """
        indicator_score = self._calculate_indicator_score(indicators, volume_trend)
        fundamental_score = self._calculate_fundamental_score(token_data)
        
        return {
            'llm_confidence': round(llm_confidence, 1),
            'indicator_score': round(indicator_score, 1),
            'fundamental_score': round(fundamental_score, 1),
            'weights': {
                'llm': self.WEIGHT_LLM,
                'indicators': self.WEIGHT_INDICATORS,
                'fundamentals': self.WEIGHT_FUNDAMENTALS
            },
            'final_score': self.calculate(
                llm_confidence, indicators, token_data, volume_trend
            )
        }


class ConfidenceLevel:
    """Helper class to interpret confidence scores."""
    
    @staticmethod
    def get_level(score: float) -> str:
        """Get confidence level label from score."""
        if score >= 80:
            return "VERY_HIGH"
        elif score >= 70:
            return "HIGH"
        elif score >= 55:
            return "MODERATE"
        elif score >= 40:
            return "LOW"
        else:
            return "VERY_LOW"
    
    @staticmethod
    def get_recommendation(score: float, decision: str) -> str:
        """Get recommendation based on confidence and decision."""
        level = ConfidenceLevel.get_level(score)
        
        if decision == "BUY":
            if level in ["VERY_HIGH", "HIGH"]:
                return "Strong buy signal - consider full position"
            elif level == "MODERATE":
                return "Buy signal - consider partial position"
            else:
                return "Weak buy signal - wait for confirmation"
        
        elif decision == "SELL":
            if level in ["VERY_HIGH", "HIGH"]:
                return "Strong sell signal - exit position"
            elif level == "MODERATE":
                return "Sell signal - consider reducing position"
            else:
                return "Weak sell signal - set tight stops"
        
        else:  # NO_BUY, HOLD
            return "Wait for better entry opportunity"
    
    @staticmethod
    def should_trade(score: float, threshold: int = 70) -> bool:
        """Check if confidence meets trading threshold."""
        return score >= threshold
