"""
Tests for AI Analysis Service.

Tests cover:
- AI Analyzer functionality
- Confidence scoring
- Risk assessment
- Prompt building
- Backtesting engine
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.ai_analyzer import AIAnalyzer, get_ai_analyzer
from app.services.confidence import ConfidenceScorer, ConfidenceLevel
from app.services.risk import RiskAssessor, RiskLevel, quick_risk_check
from app.services.prompts import PromptBuilder
from app.services.backtest import BacktestEngine, quick_backtest, BacktestTrade
from app.schemas.analysis import TokenData, OHLCVData


# Test fixtures
@pytest.fixture
def sample_token_data():
    """Create sample token data for testing."""
    return TokenData(
        symbol="BONK",
        name="Bonk",
        price=0.00002341,
        price_change_24h=5.67,
        price_change_7d=-12.34,
        volume_24h=45000000,
        liquidity=8500000,
        market_cap=1450000000,
        holders=567890
    )


@pytest.fixture
def sample_ohlcv_data():
    """Create sample OHLCV data for testing."""
    import random
    data = []
    base_price = 0.00002341
    
    for i in range(168):  # 7 days of hourly data
        timestamp = 1702400000000 + (i * 3600000)
        change = random.uniform(-0.03, 0.03)
        open_price = base_price * (1 + change)
        close_price = open_price * (1 + random.uniform(-0.02, 0.02))
        high_price = max(open_price, close_price) * (1 + random.uniform(0, 0.01))
        low_price = min(open_price, close_price) * (1 - random.uniform(0, 0.01))
        
        data.append(OHLCVData(
            timestamp=timestamp,
            open=open_price,
            high=high_price,
            low=low_price,
            close=close_price,
            volume=random.uniform(1000000, 5000000)
        ))
        base_price = close_price
    
    return data


@pytest.fixture
def sample_indicators():
    """Create sample technical indicators."""
    return {
        'rsi': 55.0,
        'volume_trend': 'INCREASING',
        'macd': {
            'macd': 0.00001,
            'signal': 0.000008,
            'histogram': 0.000002
        },
        'bollinger': {
            'upper': 0.000025,
            'middle': 0.000023,
            'lower': 0.000021
        },
        'support': 0.00002,
        'resistance': 0.000026
    }


# Confidence Scorer Tests
class TestConfidenceScorer:
    """Tests for ConfidenceScorer class."""
    
    def test_calculate_neutral_confidence(self, sample_token_data, sample_indicators):
        """Test confidence calculation with neutral indicators."""
        scorer = ConfidenceScorer()
        confidence = scorer.calculate(
            llm_confidence=65,
            indicators=sample_indicators,
            token_data=sample_token_data,
            volume_trend='STABLE'
        )
        
        assert 40 <= confidence <= 80
        assert isinstance(confidence, float)
    
    def test_calculate_high_confidence(self, sample_token_data):
        """Test confidence with bullish indicators."""
        scorer = ConfidenceScorer()
        
        bullish_indicators = {
            'rsi': 28,  # Oversold
            'macd': {'histogram': 0.001, 'macd': 0.01, 'signal': 0.005},
            'volume_trend': 'INCREASING'
        }
        
        confidence = scorer.calculate(
            llm_confidence=85,
            indicators=bullish_indicators,
            token_data=sample_token_data,
            volume_trend='INCREASING'
        )
        
        assert confidence >= 70
    
    def test_calculate_low_confidence_low_liquidity(self, sample_indicators):
        """Test confidence with low liquidity token."""
        scorer = ConfidenceScorer()
        
        low_liq_token = TokenData(
            symbol="TEST",
            price=0.001,
            liquidity=10000,  # Below minimum
            volume_24h=5000,
            holders=100
        )
        
        confidence = scorer.calculate(
            llm_confidence=80,
            indicators=sample_indicators,
            token_data=low_liq_token,
            volume_trend='STABLE'
        )
        
        # Low liquidity should reduce confidence
        assert confidence < 70
    
    def test_get_confidence_breakdown(self, sample_token_data, sample_indicators):
        """Test detailed confidence breakdown."""
        scorer = ConfidenceScorer()
        
        breakdown = scorer.get_confidence_breakdown(
            llm_confidence=70,
            indicators=sample_indicators,
            token_data=sample_token_data,
            volume_trend='STABLE'
        )
        
        assert 'llm_confidence' in breakdown
        assert 'indicator_score' in breakdown
        assert 'fundamental_score' in breakdown
        assert 'weights' in breakdown
        assert 'final_score' in breakdown


class TestConfidenceLevel:
    """Tests for ConfidenceLevel helper class."""
    
    def test_get_level_very_high(self):
        assert ConfidenceLevel.get_level(85) == "VERY_HIGH"
    
    def test_get_level_high(self):
        assert ConfidenceLevel.get_level(75) == "HIGH"
    
    def test_get_level_moderate(self):
        assert ConfidenceLevel.get_level(60) == "MODERATE"
    
    def test_get_level_low(self):
        assert ConfidenceLevel.get_level(45) == "LOW"
    
    def test_get_level_very_low(self):
        assert ConfidenceLevel.get_level(30) == "VERY_LOW"
    
    def test_should_trade_above_threshold(self):
        assert ConfidenceLevel.should_trade(75, threshold=70) is True
    
    def test_should_trade_below_threshold(self):
        assert ConfidenceLevel.should_trade(65, threshold=70) is False


# Risk Assessor Tests
class TestRiskAssessor:
    """Tests for RiskAssessor class."""
    
    def test_assess_low_risk(self, sample_token_data, sample_indicators):
        """Test risk assessment for low-risk token."""
        assessor = RiskAssessor()
        
        risk_level = assessor.assess(
            token_data=sample_token_data,
            indicators=sample_indicators,
            decision='BUY',
            position_size=50
        )
        
        assert risk_level in [RiskLevel.LOW, RiskLevel.MEDIUM]
    
    def test_assess_high_risk_low_liquidity(self, sample_indicators):
        """Test risk assessment for low liquidity token."""
        assessor = RiskAssessor()
        
        low_liq_token = TokenData(
            symbol="RISKY",
            price=0.001,
            liquidity=20000,
            volume_24h=10000,
            holders=200
        )
        
        risk_level = assessor.assess(
            token_data=low_liq_token,
            indicators=sample_indicators,
            decision='BUY',
            position_size=100
        )
        
        assert risk_level in [RiskLevel.HIGH, RiskLevel.EXTREME]
    
    def test_get_detailed_assessment(self, sample_token_data, sample_indicators):
        """Test detailed risk assessment."""
        assessor = RiskAssessor()
        
        assessment = assessor.get_detailed_assessment(
            token_data=sample_token_data,
            indicators=sample_indicators,
            decision='BUY',
            position_size=100
        )
        
        assert 'risk_level' in assessment
        assert 'risk_score' in assessment
        assert 'risk_factors' in assessment
        assert 'max_recommended_position' in assessment
        assert 'slippage_estimate' in assessment
        assert 'recommendation' in assessment
    
    def test_quick_risk_check(self):
        """Test quick risk check function."""
        result = quick_risk_check(
            liquidity=1000000,
            volume=500000,
            rsi=55,
            position_size=100
        )
        
        assert 'risk_level' in result
        assert 'risk_score' in result
        assert 'max_position' in result
        assert 'tradeable' in result


# Prompt Builder Tests
class TestPromptBuilder:
    """Tests for PromptBuilder class."""
    
    def test_get_system_prompt(self):
        """Test system prompt generation."""
        builder = PromptBuilder()
        prompt = builder.get_system_prompt()
        
        assert 'cryptocurrency' in prompt.lower()
        assert 'JSON' in prompt
        assert 'BUY' in prompt
        assert 'SELL' in prompt
    
    def test_build_analysis_prompt(self, sample_token_data, sample_indicators):
        """Test analysis prompt building."""
        builder = PromptBuilder()
        
        prompt = builder.build_analysis_prompt(
            symbol="BONK",
            token_data=sample_token_data,
            indicators=sample_indicators
        )
        
        assert 'BONK' in prompt
        assert 'RSI' in prompt
        assert 'TECHNICAL INDICATORS' in prompt
        assert 'TOKEN METRICS' in prompt
    
    def test_build_batch_analysis_prompt(self):
        """Test batch analysis prompt building."""
        builder = PromptBuilder()
        
        tokens = [
            {'symbol': 'BONK', 'price': 0.00002, 'volume_24h': 45000000, 'liquidity': 8500000, 'price_change_24h': 5.0, 'rsi': 55},
            {'symbol': 'WIF', 'price': 2.45, 'volume_24h': 120000000, 'liquidity': 25000000, 'price_change_24h': -3.0, 'rsi': 48}
        ]
        
        prompt = builder.build_batch_analysis_prompt(tokens, top_n=2)
        
        assert 'BONK' in prompt
        assert 'WIF' in prompt
        assert 'BATCH' in prompt
    
    def test_build_risk_assessment_prompt(self, sample_token_data):
        """Test risk assessment prompt building."""
        builder = PromptBuilder()
        
        prompt = builder.build_risk_assessment_prompt(
            symbol="BONK",
            token_data=sample_token_data,
            position_size=100
        )
        
        assert 'RISK' in prompt
        assert 'BONK' in prompt
        assert '100' in prompt


# Backtest Engine Tests
class TestBacktestEngine:
    """Tests for BacktestEngine class."""
    
    @pytest.fixture
    def sample_ohlcv_dicts(self):
        """Create sample OHLCV data as dicts."""
        import random
        data = []
        base_price = 1.0
        
        for i in range(200):
            timestamp = 1702400000000 + (i * 3600000)
            change = random.uniform(-0.03, 0.03)
            open_price = base_price * (1 + change)
            close_price = open_price * (1 + random.uniform(-0.02, 0.02))
            
            data.append({
                'timestamp': timestamp,
                'open': open_price,
                'high': max(open_price, close_price) * 1.005,
                'low': min(open_price, close_price) * 0.995,
                'close': close_price,
                'volume': random.uniform(1000000, 5000000)
            })
            base_price = close_price
        
        return data
    
    def test_engine_initialization(self):
        """Test engine initializes with correct parameters."""
        engine = BacktestEngine(
            initial_capital=5000,
            position_size=200,
            confidence_threshold=65
        )
        
        assert engine.initial_capital == 5000
        assert engine.position_size == 200
        assert engine.confidence_threshold == 65
    
    def test_run_backtest(self, sample_ohlcv_dicts):
        """Test running a backtest."""
        engine = BacktestEngine(
            initial_capital=1000,
            position_size=100,
            confidence_threshold=60
        )
        
        result = engine.run_backtest(
            symbol="TEST",
            ohlcv_data=sample_ohlcv_dicts
        )
        
        assert result.symbol == "TEST"
        assert result.initial_capital == 1000
        assert result.final_capital > 0
        assert 0 <= result.win_rate <= 100
        assert len(result.equity_curve) > 0
    
    def test_backtest_insufficient_data(self):
        """Test backtest with insufficient data raises error."""
        engine = BacktestEngine()
        
        short_data = [
            {'timestamp': 1, 'open': 1, 'high': 1, 'low': 1, 'close': 1, 'volume': 1000}
            for _ in range(20)
        ]
        
        with pytest.raises(ValueError, match="Insufficient data"):
            engine.run_backtest("TEST", short_data)
    
    def test_quick_backtest(self, sample_ohlcv_dicts):
        """Test quick backtest function."""
        result = quick_backtest(
            symbol="TEST",
            ohlcv_data=sample_ohlcv_dicts,
            initial_capital=1000
        )
        
        assert 'symbol' in result
        assert 'total_trades' in result
        assert 'win_rate' in result
        assert 'total_pnl' in result
        assert 'final_capital' in result


# AI Analyzer Tests
class TestAIAnalyzer:
    """Tests for AIAnalyzer class."""
    
    def test_analyzer_initialization(self):
        """Test analyzer initializes correctly."""
        analyzer = AIAnalyzer()
        
        assert analyzer.prompt_builder is not None
        assert analyzer.confidence_scorer is not None
        assert analyzer.risk_assessor is not None
    
    def test_calculate_indicators(self, sample_ohlcv_data):
        """Test indicator calculation."""
        analyzer = AIAnalyzer()
        
        closes = [c.close for c in sample_ohlcv_data]
        highs = [c.high for c in sample_ohlcv_data]
        lows = [c.low for c in sample_ohlcv_data]
        volumes = [c.volume for c in sample_ohlcv_data]
        
        indicators = analyzer._calculate_indicators(
            closes=closes,
            highs=highs,
            lows=lows,
            volumes=volumes
        )
        
        assert 'rsi' in indicators
        assert 'macd' in indicators
        assert 'bollinger' in indicators
        assert 'volume_trend' in indicators
        assert 0 <= indicators['rsi'] <= 100
    
    def test_parse_llm_response_valid(self):
        """Test parsing valid LLM response."""
        analyzer = AIAnalyzer()
        
        valid_response = '''
        {
            "decision": "BUY",
            "confidence": 75,
            "reasoning": "Strong bullish signals",
            "risk_factors": ["volatility"]
        }
        '''
        
        parsed = analyzer._parse_llm_response(valid_response)
        
        assert parsed['decision'] == 'BUY'
        assert parsed['confidence'] == 75
        assert 'reasoning' in parsed
    
    def test_parse_llm_response_invalid_json(self):
        """Test parsing invalid JSON response."""
        analyzer = AIAnalyzer()
        
        invalid_response = "This is not JSON"
        
        parsed = analyzer._parse_llm_response(invalid_response)
        
        assert parsed['decision'] == 'NO_BUY'
        assert parsed['confidence'] == 30
    
    def test_fallback_analysis(self, sample_token_data, sample_indicators):
        """Test fallback rule-based analysis."""
        analyzer = AIAnalyzer()
        
        result = analyzer._fallback_analysis(
            symbol="BONK",
            token_data=sample_token_data,
            indicators=sample_indicators
        )
        
        assert result['decision'] in ['BUY', 'SELL', 'NO_BUY', 'HOLD']
        assert 0 <= result['confidence'] <= 100
        assert 'reasoning' in result
    
    def test_fallback_oversold_signal(self, sample_token_data):
        """Test fallback generates BUY signal for oversold RSI."""
        analyzer = AIAnalyzer()
        
        oversold_indicators = {
            'rsi': 25,  # Oversold
            'volume_trend': 'INCREASING',
            'macd': {'histogram': 0.001, 'macd': 0.01, 'signal': 0.005}
        }
        
        result = analyzer._fallback_analysis(
            symbol="BONK",
            token_data=sample_token_data,
            indicators=oversold_indicators
        )
        
        assert result['decision'] == 'BUY'


# Integration Tests
@pytest.mark.asyncio
class TestAnalysisIntegration:
    """Integration tests for the analysis pipeline."""
    
    async def test_full_analysis_pipeline(self, sample_token_data, sample_ohlcv_data):
        """Test complete analysis pipeline."""
        analyzer = AIAnalyzer()
        
        # Convert sample_ohlcv_data to list of dicts
        ohlcv_list = [
            {
                'timestamp': c.timestamp,
                'open': c.open,
                'high': c.high,
                'low': c.low,
                'close': c.close,
                'volume': c.volume
            }
            for c in sample_ohlcv_data
        ]
        
        # Convert token_data to dict
        token_dict = {
            'price': sample_token_data.price,
            'volume24h': sample_token_data.volume_24h or 0,
            'liquidity': sample_token_data.liquidity or 0,
            'marketCap': sample_token_data.market_cap or 0
        }
        
        # Calculate indicators
        closes = [c.close for c in sample_ohlcv_data]
        indicators = {
            'rsi': 55,
            'volumeTrend': 'STABLE',
            'volume_trend': 'STABLE'
        }
        
        # Call analyze_token (will use mock analysis since no API key)
        result = await analyzer.analyze_token(
            symbol="BONK",
            token_data=token_dict,
            ohlcv=ohlcv_list,
            indicators=indicators
        )
        
        assert result['symbol'] == "BONK"
        assert result['decision'] in ['BUY', 'SELL', 'NO_BUY', 'HOLD']
        assert 0 <= result['confidence'] <= 100
        assert result['riskLevel'] is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
