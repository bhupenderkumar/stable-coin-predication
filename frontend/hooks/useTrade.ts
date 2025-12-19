'use client';

import { useState, useCallback } from 'react';
import { TradeRequest, TradeResponse, Trade, Portfolio } from '@/types';
import { api } from '@/lib/api';
import { usePortfolioStore } from '@/stores/portfolio-store';

interface UseTradeReturn {
  isLoading: boolean;
  error: Error | null;
  lastTrade: TradeResponse | null;
  executeTrade: (request: TradeRequest) => Promise<TradeResponse | null>;
  reset: () => void;
}

/**
 * Hook for executing trades
 */
export function useTrade(): UseTradeReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastTrade, setLastTrade] = useState<TradeResponse | null>(null);
  const { addTrade, updateHolding, refreshPortfolio } = usePortfolioStore();

  const executeTrade = useCallback(
    async (request: TradeRequest): Promise<TradeResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.executeTrade(request);
        setLastTrade(response);

        if (response.status === 'EXECUTED') {
          // Update portfolio store
          addTrade({
            id: response.id,
            symbol: response.symbol,
            type: response.type,
            amountIn: response.amountIn,
            amountOut: response.amountOut,
            price: response.price,
            fee: response.fee,
            status: 'EXECUTED',
            timestamp: response.timestamp,
          });

          // Refresh portfolio to get updated balances
          await refreshPortfolio();
        }

        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Trade execution failed');
        setError(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [addTrade, refreshPortfolio]
  );

  const reset = useCallback(() => {
    setLastTrade(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    error,
    lastTrade,
    executeTrade,
    reset,
  };
}

interface UseTradeHistoryReturn {
  trades: Trade[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching trade history
 */
export function useTradeHistory(): UseTradeHistoryReturn {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTrades = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.getTrades();
      setTrades(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch trades'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useState(() => {
    fetchTrades();
  });

  return {
    trades,
    isLoading,
    error,
    refetch: fetchTrades,
  };
}

interface UsePortfolioReturn {
  portfolio: Portfolio | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching portfolio data
 */
export function usePortfolio(): UsePortfolioReturn {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPortfolio = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.getPortfolio();
      setPortfolio(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch portfolio'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useState(() => {
    fetchPortfolio();
  });

  return {
    portfolio,
    isLoading,
    error,
    refetch: fetchPortfolio,
  };
}

interface TradeValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface UseTradeValidationReturn {
  validate: (request: Partial<TradeRequest>, balance: number, tokenBalance: number) => TradeValidation;
}

/**
 * Hook for trade validation
 */
export function useTradeValidation(): UseTradeValidationReturn {
  const validate = useCallback(
    (request: Partial<TradeRequest>, balance: number, tokenBalance: number): TradeValidation => {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Check required fields
      if (!request.symbol) {
        errors.push('Token symbol is required');
      }

      if (!request.type) {
        errors.push('Trade type (BUY/SELL) is required');
      }

      if (!request.amount || request.amount <= 0) {
        errors.push('Amount must be greater than 0');
      }

      // Check balance
      if (request.type === 'BUY' && request.amount && request.amount > balance) {
        errors.push('Insufficient balance');
      }

      if (request.type === 'SELL' && request.amount && request.amount > tokenBalance) {
        errors.push('Insufficient token balance');
      }

      // Check slippage
      if (request.slippageBps !== undefined) {
        if (request.slippageBps < 10) {
          warnings.push('Slippage is very low, trade may fail');
        }
        if (request.slippageBps > 500) {
          warnings.push('Slippage is very high, you may lose value');
        }
      }

      // Check amount size
      if (request.amount && request.amount < 1) {
        warnings.push('Trade amount is very small');
      }

      if (request.type === 'BUY' && request.amount && request.amount > balance * 0.5) {
        warnings.push('This trade uses more than 50% of your balance');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    },
    []
  );

  return { validate };
}

interface UseQuickTradeReturn {
  buy: (symbol: string, amount: number) => Promise<TradeResponse | null>;
  sell: (symbol: string, amount: number) => Promise<TradeResponse | null>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for quick trades with preset slippage
 */
export function useQuickTrade(defaultSlippageBps: number = 50): UseQuickTradeReturn {
  const { executeTrade, isLoading, error } = useTrade();

  const buy = useCallback(
    async (symbol: string, amount: number) => {
      return executeTrade({
        symbol,
        type: 'BUY',
        amount,
        slippageBps: defaultSlippageBps,
      });
    },
    [executeTrade, defaultSlippageBps]
  );

  const sell = useCallback(
    async (symbol: string, amount: number) => {
      return executeTrade({
        symbol,
        type: 'SELL',
        amount,
        slippageBps: defaultSlippageBps,
      });
    },
    [executeTrade, defaultSlippageBps]
  );

  return {
    buy,
    sell,
    isLoading,
    error,
  };
}

export default useTrade;