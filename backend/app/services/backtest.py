"""
Backtesting Engine for AI Trading Strategies.

Simulates historical trades to evaluate strategy performance.
Uses historical OHLCV data and AI analysis to generate trade signals.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum

from app.services.confidence import ConfidenceScorer
from app.services.risk import RiskAssessor, RiskLevel
from app.utils.indicators import (
    calculate_rsi,
    calculate_macd,
    calculate_bollinger_bands,
    calculate_volume_trend,
    calculate_support_resistance,
)

logger = logging.getLogger(__name__)


class TradeDirection(str, Enum):
    """Trade direction."""
    LONG = "LONG"
    SHORT = "SHORT"


@dataclass
class BacktestTrade:
    """Represents a single backtest trade."""
    entry_timestamp: int
    exit_timestamp: Optional[int] = None
    direction: TradeDirection = TradeDirection.LONG
    entry_price: float = 0.0
    exit_price: Optional[float] = None
    position_size: float = 100.0  # USD
    pnl: float = 0.0
    pnl_percent: float = 0.0
    fees: float = 0.0
    confidence: float = 0.0
    indicators: Dict[str, Any] = field(default_factory=dict)
    
    @property
    def is_winner(self) -> bool:
        """Check if trade was profitable."""
        return self.pnl > 0


@dataclass
class BacktestResult:
    """Complete backtest results."""
    symbol: str
    start_date: datetime
    end_date: datetime
    initial_capital: float
    final_capital: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    total_pnl: float
    total_pnl_percent: float
    max_drawdown: float
    max_drawdown_percent: float
    sharpe_ratio: float
    avg_trade_pnl: float
    avg_winning_trade: float
    avg_losing_trade: float
    largest_winner: float
    largest_loser: float
    profit_factor: float
    trades: List[BacktestTrade] = field(default_factory=list)
    equity_curve: List[float] = field(default_factory=list)


class BacktestEngine:
    """
    Backtesting engine for AI trading strategies.
    
    Evaluates trading strategy performance using historical data.
    Simulates realistic trading conditions including fees and slippage.
    """
    
    # Trading parameters
    DEFAULT_POSITION_SIZE = 100  # USD per trade
    TRADING_FEE = 0.003  # 0.3% per trade
    SLIPPAGE = 0.001  # 0.1% slippage
    
    def __init__(
        self,
        initial_capital: float = 1000,
        position_size: float = 100,
        confidence_threshold: int = 70,
        max_positions: int = 3,
        stop_loss_pct: float = 0.10,  # 10% stop loss
        take_profit_pct: float = 0.20,  # 20% take profit
    ):
        """
        Initialize backtesting engine.
        
        Args:
            initial_capital: Starting capital in USD
            position_size: USD amount per trade
            confidence_threshold: Minimum confidence to enter trade
            max_positions: Maximum concurrent positions
            stop_loss_pct: Stop loss percentage
            take_profit_pct: Take profit percentage
        """
        self.initial_capital = initial_capital
        self.position_size = position_size
        self.confidence_threshold = confidence_threshold
        self.max_positions = max_positions
        self.stop_loss_pct = stop_loss_pct
        self.take_profit_pct = take_profit_pct
        
        self.confidence_scorer = ConfidenceScorer()
        self.risk_assessor = RiskAssessor()
    
    def run_backtest(
        self,
        symbol: str,
        ohlcv_data: List[Dict[str, Any]],
        token_data: Optional[Dict[str, Any]] = None
    ) -> BacktestResult:
        """
        Run a backtest on historical data.
        
        Args:
            symbol: Token symbol
            ohlcv_data: Historical OHLCV data (list of dicts)
            token_data: Token metadata (liquidity, holders, etc.)
        
        Returns:
            BacktestResult with performance metrics
        """
        if len(ohlcv_data) < 50:
            raise ValueError("Insufficient data for backtest (need at least 50 candles)")
        
        # Initialize state
        capital = self.initial_capital
        positions: List[BacktestTrade] = []
        closed_trades: List[BacktestTrade] = []
        equity_curve = [capital]
        
        # Extract price arrays
        closes = [candle['close'] for candle in ohlcv_data]
        highs = [candle['high'] for candle in ohlcv_data]
        lows = [candle['low'] for candle in ohlcv_data]
        volumes = [candle['volume'] for candle in ohlcv_data]
        timestamps = [candle['timestamp'] for candle in ohlcv_data]
        
        # Pre-calculate indicators for full dataset
        rsi_values = calculate_rsi(closes)
        macd_data = calculate_macd(closes)
        bb_data = calculate_bollinger_bands(closes)
        
        # Minimum lookback period for indicators
        min_lookback = 30
        
        # Iterate through each candle (starting after lookback period)
        for i in range(min_lookback, len(ohlcv_data)):
            current_candle = ohlcv_data[i]
            current_price = current_candle['close']
            current_high = current_candle['high']
            current_low = current_candle['low']
            timestamp = timestamps[i]
            
            # Get current indicator values
            current_rsi = rsi_values[i]
            current_macd = {
                'macd': macd_data['macd'][i],
                'signal': macd_data['signal'][i],
                'histogram': macd_data['histogram'][i]
            }
            volume_trend = calculate_volume_trend(volumes[max(0, i-14):i])
            
            # Check open positions for exit conditions
            positions_to_close = []
            for j, pos in enumerate(positions):
                # Calculate current P&L
                current_pnl_pct = (current_price - pos.entry_price) / pos.entry_price
                
                # Check stop loss
                if current_pnl_pct <= -self.stop_loss_pct:
                    pos.exit_price = pos.entry_price * (1 - self.stop_loss_pct)
                    pos.exit_timestamp = timestamp
                    positions_to_close.append(j)
                    logger.debug(f"Stop loss hit for {symbol} at {pos.exit_price}")
                
                # Check take profit
                elif current_pnl_pct >= self.take_profit_pct:
                    pos.exit_price = pos.entry_price * (1 + self.take_profit_pct)
                    pos.exit_timestamp = timestamp
                    positions_to_close.append(j)
                    logger.debug(f"Take profit hit for {symbol} at {pos.exit_price}")
                
                # Check trailing stop (if in profit)
                elif current_pnl_pct > 0.05:  # 5% in profit
                    # Trail at half the gain
                    trail_price = pos.entry_price * (1 + current_pnl_pct * 0.5)
                    if current_low <= trail_price:
                        pos.exit_price = trail_price
                        pos.exit_timestamp = timestamp
                        positions_to_close.append(j)
            
            # Close positions and calculate P&L
            for j in sorted(positions_to_close, reverse=True):
                pos = positions.pop(j)
                self._calculate_trade_pnl(pos)
                capital += pos.pnl
                closed_trades.append(pos)
            
            # Check for new entry signals
            if len(positions) < self.max_positions:
                signal = self._generate_signal(
                    current_price=current_price,
                    rsi=current_rsi,
                    macd=current_macd,
                    volume_trend=volume_trend,
                    bb_data=bb_data,
                    index=i,
                    token_data=token_data
                )
                
                if signal['action'] == 'BUY' and signal['confidence'] >= self.confidence_threshold:
                    # Calculate position size based on available capital
                    trade_size = min(self.position_size, capital * 0.25)  # Max 25% per trade
                    
                    if trade_size >= 10:  # Minimum $10 trade
                        # Apply entry slippage
                        entry_price = current_price * (1 + self.SLIPPAGE)
                        
                        trade = BacktestTrade(
                            entry_timestamp=timestamp,
                            direction=TradeDirection.LONG,
                            entry_price=entry_price,
                            position_size=trade_size,
                            confidence=signal['confidence'],
                            indicators={
                                'rsi': current_rsi,
                                'macd_histogram': current_macd['histogram'],
                                'volume_trend': volume_trend
                            }
                        )
                        positions.append(trade)
                        capital -= trade_size  # Deduct position from capital
                        logger.debug(f"Opened position for {symbol} at {entry_price}")
            
            # Track equity
            position_value = sum(
                pos.position_size * (current_price / pos.entry_price)
                for pos in positions
            )
            equity_curve.append(capital + position_value)
        
        # Close any remaining positions at last price
        final_price = closes[-1]
        for pos in positions:
            pos.exit_price = final_price * (1 - self.SLIPPAGE)
            pos.exit_timestamp = timestamps[-1]
            self._calculate_trade_pnl(pos)
            capital += pos.pnl
            closed_trades.append(pos)
        
        # Calculate final metrics
        return self._calculate_results(
            symbol=symbol,
            trades=closed_trades,
            equity_curve=equity_curve,
            timestamps=timestamps,
            min_lookback=min_lookback
        )
    
    def _generate_signal(
        self,
        current_price: float,
        rsi: float,
        macd: Dict[str, float],
        volume_trend: str,
        bb_data: Dict[str, List[float]],
        index: int,
        token_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate trading signal based on indicators.
        
        Uses similar logic to AI analyzer fallback analysis.
        """
        action = 'HOLD'
        confidence = 50
        reasons = []
        
        # RSI signals
        if rsi < 30:
            reasons.append("RSI oversold")
            confidence += 20
            action = 'BUY'
        elif rsi < 40:
            reasons.append("RSI approaching oversold")
            confidence += 10
        elif rsi > 70:
            reasons.append("RSI overbought - avoid")
            confidence -= 15
        
        # MACD signals
        if macd['histogram'] > 0 and macd['macd'] > macd['signal']:
            reasons.append("MACD bullish")
            confidence += 15
            if action != 'BUY':
                action = 'BUY'
        elif macd['histogram'] < 0:
            reasons.append("MACD bearish")
            confidence -= 10
        
        # Volume trend
        if volume_trend == 'INCREASING':
            reasons.append("Volume increasing")
            confidence += 10
        elif volume_trend == 'DECREASING':
            reasons.append("Volume decreasing")
            confidence -= 10
        
        # Bollinger Bands
        if index < len(bb_data['lower']):
            lower_bb = bb_data['lower'][index]
            upper_bb = bb_data['upper'][index]
            
            if current_price <= lower_bb:
                reasons.append("Price at lower Bollinger Band")
                confidence += 15
                action = 'BUY'
            elif current_price >= upper_bb:
                reasons.append("Price at upper Bollinger Band")
                confidence -= 15
        
        # Normalize confidence
        confidence = max(20, min(90, confidence))
        
        # Apply confidence threshold
        if confidence < self.confidence_threshold:
            action = 'HOLD'
        
        return {
            'action': action,
            'confidence': confidence,
            'reasons': reasons
        }
    
    def _calculate_trade_pnl(self, trade: BacktestTrade):
        """Calculate P&L for a completed trade."""
        if trade.exit_price is None:
            return
        
        # Calculate gross P&L
        price_change = (trade.exit_price - trade.entry_price) / trade.entry_price
        gross_pnl = trade.position_size * price_change
        
        # Subtract trading fees (entry + exit)
        fees = trade.position_size * self.TRADING_FEE * 2
        
        trade.pnl = gross_pnl - fees
        trade.pnl_percent = (trade.pnl / trade.position_size) * 100
        trade.fees = fees
    
    def _calculate_results(
        self,
        symbol: str,
        trades: List[BacktestTrade],
        equity_curve: List[float],
        timestamps: List[int],
        min_lookback: int
    ) -> BacktestResult:
        """Calculate final backtest statistics."""
        
        total_trades = len(trades)
        if total_trades == 0:
            return BacktestResult(
                symbol=symbol,
                start_date=datetime.fromtimestamp(timestamps[min_lookback] / 1000),
                end_date=datetime.fromtimestamp(timestamps[-1] / 1000),
                initial_capital=self.initial_capital,
                final_capital=self.initial_capital,
                total_trades=0,
                winning_trades=0,
                losing_trades=0,
                win_rate=0.0,
                total_pnl=0.0,
                total_pnl_percent=0.0,
                max_drawdown=0.0,
                max_drawdown_percent=0.0,
                sharpe_ratio=0.0,
                avg_trade_pnl=0.0,
                avg_winning_trade=0.0,
                avg_losing_trade=0.0,
                largest_winner=0.0,
                largest_loser=0.0,
                profit_factor=0.0,
                trades=trades,
                equity_curve=equity_curve
            )
        
        # Trade statistics
        winning_trades = [t for t in trades if t.is_winner]
        losing_trades = [t for t in trades if not t.is_winner]
        
        total_pnl = sum(t.pnl for t in trades)
        final_capital = equity_curve[-1]
        
        # Win rate
        win_rate = (len(winning_trades) / total_trades) * 100 if total_trades > 0 else 0
        
        # Average trade P&L
        avg_trade_pnl = total_pnl / total_trades if total_trades > 0 else 0
        avg_winning = sum(t.pnl for t in winning_trades) / len(winning_trades) if winning_trades else 0
        avg_losing = sum(t.pnl for t in losing_trades) / len(losing_trades) if losing_trades else 0
        
        # Largest trades
        largest_winner = max((t.pnl for t in trades), default=0)
        largest_loser = min((t.pnl for t in trades), default=0)
        
        # Profit factor
        gross_profit = sum(t.pnl for t in winning_trades)
        gross_loss = abs(sum(t.pnl for t in losing_trades))
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf')
        
        # Max drawdown
        peak = equity_curve[0]
        max_drawdown = 0
        max_drawdown_pct = 0
        
        for equity in equity_curve:
            if equity > peak:
                peak = equity
            drawdown = peak - equity
            drawdown_pct = (drawdown / peak) * 100 if peak > 0 else 0
            
            if drawdown > max_drawdown:
                max_drawdown = drawdown
                max_drawdown_pct = drawdown_pct
        
        # Sharpe Ratio (simplified - assumes risk-free rate of 0)
        if len(equity_curve) > 1:
            import numpy as np
            returns = np.diff(equity_curve) / equity_curve[:-1]
            sharpe = (np.mean(returns) / np.std(returns)) * np.sqrt(252) if np.std(returns) > 0 else 0
        else:
            sharpe = 0
        
        return BacktestResult(
            symbol=symbol,
            start_date=datetime.fromtimestamp(timestamps[min_lookback] / 1000),
            end_date=datetime.fromtimestamp(timestamps[-1] / 1000),
            initial_capital=self.initial_capital,
            final_capital=final_capital,
            total_trades=total_trades,
            winning_trades=len(winning_trades),
            losing_trades=len(losing_trades),
            win_rate=round(win_rate, 2),
            total_pnl=round(total_pnl, 2),
            total_pnl_percent=round((total_pnl / self.initial_capital) * 100, 2),
            max_drawdown=round(max_drawdown, 2),
            max_drawdown_percent=round(max_drawdown_pct, 2),
            sharpe_ratio=round(sharpe, 2),
            avg_trade_pnl=round(avg_trade_pnl, 2),
            avg_winning_trade=round(avg_winning, 2),
            avg_losing_trade=round(avg_losing, 2),
            largest_winner=round(largest_winner, 2),
            largest_loser=round(largest_loser, 2),
            profit_factor=round(profit_factor, 2) if profit_factor != float('inf') else 999.99,
            trades=trades,
            equity_curve=equity_curve
        )
    
    def run_multi_symbol_backtest(
        self,
        symbols: List[str],
        ohlcv_map: Dict[str, List[Dict[str, Any]]],
        token_data_map: Optional[Dict[str, Dict[str, Any]]] = None
    ) -> Dict[str, BacktestResult]:
        """
        Run backtests on multiple symbols.
        
        Args:
            symbols: List of symbols to test
            ohlcv_map: Map of symbol to OHLCV data
            token_data_map: Optional map of symbol to token metadata
        
        Returns:
            Dictionary of symbol to BacktestResult
        """
        results = {}
        
        for symbol in symbols:
            if symbol not in ohlcv_map:
                logger.warning(f"No OHLCV data for {symbol}, skipping")
                continue
            
            try:
                token_data = token_data_map.get(symbol) if token_data_map else None
                result = self.run_backtest(
                    symbol=symbol,
                    ohlcv_data=ohlcv_map[symbol],
                    token_data=token_data
                )
                results[symbol] = result
                logger.info(
                    f"{symbol}: {result.total_trades} trades, "
                    f"{result.win_rate}% win rate, "
                    f"${result.total_pnl} P&L"
                )
            except Exception as e:
                logger.error(f"Backtest failed for {symbol}: {e}")
                continue
        
        return results
    
    def compare_strategies(
        self,
        symbol: str,
        ohlcv_data: List[Dict[str, Any]],
        strategy_params: List[Dict[str, Any]]
    ) -> List[BacktestResult]:
        """
        Compare multiple strategy parameter sets.
        
        Useful for optimization and finding best parameters.
        
        Args:
            symbol: Token symbol
            ohlcv_data: Historical data
            strategy_params: List of parameter dictionaries
        
        Returns:
            List of BacktestResult for each strategy
        """
        results = []
        
        for params in strategy_params:
            # Create engine with specific parameters
            engine = BacktestEngine(
                initial_capital=params.get('initial_capital', 1000),
                position_size=params.get('position_size', 100),
                confidence_threshold=params.get('confidence_threshold', 70),
                stop_loss_pct=params.get('stop_loss_pct', 0.10),
                take_profit_pct=params.get('take_profit_pct', 0.20)
            )
            
            try:
                result = engine.run_backtest(symbol, ohlcv_data)
                results.append(result)
            except Exception as e:
                logger.error(f"Strategy comparison failed: {e}")
                continue
        
        # Sort by total P&L
        results.sort(key=lambda x: x.total_pnl, reverse=True)
        return results


# Convenience function
def quick_backtest(
    symbol: str,
    ohlcv_data: List[Dict[str, Any]],
    initial_capital: float = 1000
) -> Dict[str, Any]:
    """
    Run a quick backtest with default parameters.
    
    Returns simplified results dictionary.
    """
    engine = BacktestEngine(initial_capital=initial_capital)
    result = engine.run_backtest(symbol, ohlcv_data)
    
    return {
        'symbol': result.symbol,
        'total_trades': result.total_trades,
        'win_rate': result.win_rate,
        'total_pnl': result.total_pnl,
        'total_pnl_percent': result.total_pnl_percent,
        'max_drawdown_percent': result.max_drawdown_percent,
        'profit_factor': result.profit_factor,
        'sharpe_ratio': result.sharpe_ratio,
        'final_capital': result.final_capital
    }
