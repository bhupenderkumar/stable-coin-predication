"""
Risk Assessment Logic for Trading Decisions.
Evaluates trade risk based on multiple factors including liquidity,
volatility, position sizing, and market conditions.
"""

from typing import Dict, Any, List, Optional
from enum import Enum


class RiskLevel(str, Enum):
    """Risk level categories."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    EXTREME = "EXTREME"


class RiskFactor(str, Enum):
    """Common risk factors for meme coins."""
    LOW_LIQUIDITY = "Low liquidity - high slippage risk"
    LOW_VOLUME = "Low trading volume - limited market depth"
    HIGH_VOLATILITY = "High price volatility"
    OVERBOUGHT = "RSI indicates overbought conditions"
    LOW_HOLDERS = "Low holder count - concentration risk"
    RECENT_PUMP = "Recent significant price increase"
    NEW_TOKEN = "New/unproven token"
    POSITION_TOO_LARGE = "Position size too large for liquidity"
    DECLINING_VOLUME = "Declining trading volume"
    NO_SUPPORT = "Price near no clear support level"


class RiskAssessor:
    """
    Assesses trading risk for Solana meme coins.
    
    Considers:
    - Liquidity risk (slippage, exit difficulty)
    - Volatility risk (price swings)
    - Concentration risk (holder distribution)
    - Timing risk (overbought/oversold)
    - Position sizing risk
    """
    
    # Risk thresholds
    LIQUIDITY_LOW = 50000  # $50k - minimum acceptable
    LIQUIDITY_MEDIUM = 200000  # $200k - moderate
    LIQUIDITY_HIGH = 1000000  # $1M+ - good liquidity
    
    VOLUME_LOW = 50000  # $50k daily
    VOLUME_MEDIUM = 250000  # $250k daily
    VOLUME_HIGH = 1000000  # $1M+ daily
    
    HOLDERS_LOW = 500
    HOLDERS_MEDIUM = 2000
    HOLDERS_HIGH = 10000
    
    VOLATILITY_HIGH_THRESHOLD = 30  # 30% 24h change
    PUMP_THRESHOLD = 50  # 50% 7d gain
    
    def assess(
        self,
        token_data: Any,
        indicators: Dict[str, Any],
        decision: str,
        position_size: float = 100
    ) -> RiskLevel:
        """
        Assess overall risk level for a trade.
        
        Args:
            token_data: Token metrics
            indicators: Technical indicators
            decision: Trading decision (BUY, SELL, etc.)
            position_size: Proposed position size in USD
        
        Returns:
            RiskLevel enum value
        """
        risk_score = self._calculate_risk_score(
            token_data, indicators, decision, position_size
        )
        
        return self._score_to_level(risk_score)
    
    def get_detailed_assessment(
        self,
        token_data: Any,
        indicators: Dict[str, Any],
        decision: str,
        position_size: float = 100
    ) -> Dict[str, Any]:
        """
        Get detailed risk assessment with all factors.
        
        Returns:
            Dictionary with risk level, score, factors, and recommendations
        """
        risk_factors = self._identify_risk_factors(
            token_data, indicators, decision, position_size
        )
        risk_score = self._calculate_risk_score(
            token_data, indicators, decision, position_size
        )
        risk_level = self._score_to_level(risk_score)
        
        max_position = self._calculate_max_position(token_data)
        slippage_estimate = self._estimate_slippage(token_data, position_size)
        
        return {
            'risk_level': risk_level.value,
            'risk_score': round(risk_score, 1),
            'risk_factors': [f.value for f in risk_factors],
            'max_recommended_position': max_position,
            'slippage_estimate': slippage_estimate,
            'recommendation': self._get_recommendation(risk_level, position_size, max_position)
        }
    
    def _calculate_risk_score(
        self,
        token_data: Any,
        indicators: Dict[str, Any],
        decision: str,
        position_size: float
    ) -> float:
        """
        Calculate numerical risk score (0-100).
        Higher score = higher risk.
        """
        score = 25  # Base risk for meme coins
        
        if not token_data:
            return 75  # High risk if no data
        
        # Liquidity risk (0-25 points)
        liquidity = getattr(token_data, 'liquidity', 0) or 0
        if liquidity < self.LIQUIDITY_LOW:
            score += 25
        elif liquidity < self.LIQUIDITY_MEDIUM:
            score += 15
        elif liquidity < self.LIQUIDITY_HIGH:
            score += 5
        
        # Volume risk (0-15 points)
        volume = getattr(token_data, 'volume_24h', 0) or 0
        if volume < self.VOLUME_LOW:
            score += 15
        elif volume < self.VOLUME_MEDIUM:
            score += 8
        elif volume < self.VOLUME_HIGH:
            score += 3
        
        # Volatility risk (0-15 points)
        price_change_24h = abs(getattr(token_data, 'price_change_24h', 0) or 0)
        if price_change_24h > self.VOLATILITY_HIGH_THRESHOLD:
            score += 15
        elif price_change_24h > 15:
            score += 8
        elif price_change_24h > 5:
            score += 3
        
        # Holder concentration risk (0-10 points)
        holders = getattr(token_data, 'holders', 0) or 0
        if holders < self.HOLDERS_LOW:
            score += 10
        elif holders < self.HOLDERS_MEDIUM:
            score += 5
        
        # RSI risk (0-10 points)
        rsi = indicators.get('rsi', 50)
        if rsi > 80:
            score += 10  # Extremely overbought
        elif rsi > 70:
            score += 5  # Overbought
        elif rsi < 20:
            score += 3  # Could be capitulation
        
        # Recent pump risk (0-10 points)
        price_change_7d = getattr(token_data, 'price_change_7d', 0) or 0
        if price_change_7d > self.PUMP_THRESHOLD:
            score += 10
        elif price_change_7d > 30:
            score += 5
        
        # Position size risk (0-15 points)
        if liquidity > 0:
            position_pct = (position_size / liquidity) * 100
            if position_pct > 2:
                score += 15  # Position is >2% of liquidity
            elif position_pct > 1:
                score += 10
            elif position_pct > 0.5:
                score += 5
        
        # Volume trend risk (0-5 points)
        volume_trend = indicators.get('volume_trend', 'STABLE')
        if volume_trend == 'DECREASING':
            score += 5
        
        return min(100, max(0, score))
    
    def _score_to_level(self, score: float) -> RiskLevel:
        """Convert numerical score to risk level."""
        if score >= 75:
            return RiskLevel.EXTREME
        elif score >= 55:
            return RiskLevel.HIGH
        elif score >= 35:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW
    
    def _identify_risk_factors(
        self,
        token_data: Any,
        indicators: Dict[str, Any],
        decision: str,
        position_size: float
    ) -> List[RiskFactor]:
        """Identify all applicable risk factors."""
        factors = []
        
        if not token_data:
            return [RiskFactor.LOW_LIQUIDITY, RiskFactor.LOW_VOLUME]
        
        liquidity = getattr(token_data, 'liquidity', 0) or 0
        volume = getattr(token_data, 'volume_24h', 0) or 0
        holders = getattr(token_data, 'holders', 0) or 0
        price_change_24h = abs(getattr(token_data, 'price_change_24h', 0) or 0)
        price_change_7d = getattr(token_data, 'price_change_7d', 0) or 0
        rsi = indicators.get('rsi', 50)
        volume_trend = indicators.get('volume_trend', 'STABLE')
        
        # Check each risk factor
        if liquidity < self.LIQUIDITY_LOW:
            factors.append(RiskFactor.LOW_LIQUIDITY)
        
        if volume < self.VOLUME_LOW:
            factors.append(RiskFactor.LOW_VOLUME)
        
        if price_change_24h > self.VOLATILITY_HIGH_THRESHOLD:
            factors.append(RiskFactor.HIGH_VOLATILITY)
        
        if rsi > 70:
            factors.append(RiskFactor.OVERBOUGHT)
        
        if holders < self.HOLDERS_LOW:
            factors.append(RiskFactor.LOW_HOLDERS)
        
        if price_change_7d > self.PUMP_THRESHOLD:
            factors.append(RiskFactor.RECENT_PUMP)
        
        if liquidity > 0 and (position_size / liquidity) > 0.02:
            factors.append(RiskFactor.POSITION_TOO_LARGE)
        
        if volume_trend == 'DECREASING':
            factors.append(RiskFactor.DECLINING_VOLUME)
        
        return factors
    
    def _calculate_max_position(self, token_data: Any) -> float:
        """
        Calculate maximum recommended position size.
        
        Rule: Position should be <= 1% of liquidity for safe entry/exit.
        """
        if not token_data:
            return 50  # Minimum safe position
        
        liquidity = getattr(token_data, 'liquidity', 0) or 0
        
        if liquidity < self.LIQUIDITY_LOW:
            return 50  # $50 max for very low liquidity
        
        # 1% of liquidity, capped at $1000
        max_pos = liquidity * 0.01
        return min(1000, max(50, max_pos))
    
    def _estimate_slippage(
        self,
        token_data: Any,
        position_size: float
    ) -> float:
        """
        Estimate slippage percentage for a given position size.
        
        Simplified model based on liquidity ratio.
        """
        if not token_data:
            return 5.0  # Assume high slippage
        
        liquidity = getattr(token_data, 'liquidity', 0) or 0
        
        if liquidity <= 0:
            return 10.0  # Maximum slippage
        
        # Position as percentage of liquidity
        position_pct = (position_size / liquidity) * 100
        
        # Simplified slippage model
        # Every 0.5% of liquidity = ~0.5% slippage
        base_slippage = 0.3  # Base DEX fee
        position_slippage = position_pct * 1.0  # 1:1 ratio estimate
        
        return round(base_slippage + position_slippage, 2)
    
    def _get_recommendation(
        self,
        risk_level: RiskLevel,
        position_size: float,
        max_position: float
    ) -> str:
        """Get actionable recommendation based on risk assessment."""
        if risk_level == RiskLevel.EXTREME:
            return "AVOID - Risk is too high for this trade"
        
        if risk_level == RiskLevel.HIGH:
            if position_size > max_position:
                return f"REDUCE_SIZE - Max recommended: ${max_position:.0f}"
            return "PROCEED_WITH_CAUTION - Set tight stop-loss"
        
        if risk_level == RiskLevel.MEDIUM:
            if position_size > max_position * 1.5:
                return f"REDUCE_SIZE - Consider position of ${max_position:.0f}"
            return "PROCEED - Normal meme coin risk"
        
        # LOW risk
        return "PROCEED - Favorable risk profile"


# Convenience function for quick risk check
def quick_risk_check(
    liquidity: float,
    volume: float,
    rsi: float,
    position_size: float = 100
) -> Dict[str, Any]:
    """
    Quick risk assessment with minimal data.
    
    Args:
        liquidity: Token liquidity in USD
        volume: 24h volume in USD
        rsi: Current RSI value
        position_size: Proposed position in USD
    
    Returns:
        Dictionary with risk level and key metrics
    """
    risk_score = 25  # Base
    
    if liquidity < 50000:
        risk_score += 25
    elif liquidity < 200000:
        risk_score += 15
    
    if volume < 50000:
        risk_score += 15
    elif volume < 250000:
        risk_score += 8
    
    if rsi > 70:
        risk_score += 10
    elif rsi < 30:
        risk_score += 3
    
    if liquidity > 0:
        position_pct = (position_size / liquidity) * 100
        if position_pct > 2:
            risk_score += 15
        elif position_pct > 1:
            risk_score += 10
    
    if risk_score >= 75:
        level = "EXTREME"
    elif risk_score >= 55:
        level = "HIGH"
    elif risk_score >= 35:
        level = "MEDIUM"
    else:
        level = "LOW"
    
    return {
        'risk_level': level,
        'risk_score': min(100, risk_score),
        'max_position': min(1000, liquidity * 0.01) if liquidity > 0 else 50,
        'tradeable': risk_score < 75
    }
