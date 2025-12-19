'use client';

import { useState, useEffect, useCallback } from 'react';
import { Token, OHLCV, TimeInterval } from '@/types';
import { api } from '@/lib/api';

interface UseTokensOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseTokensReturn {
  tokens: Token[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching and managing token list data
 */
export function useTokens(options: UseTokensOptions = {}): UseTokensReturn {
  const { autoRefresh = false, refreshInterval = 30000 } = options;
  
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTokens = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getTokens();
      setTokens(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch tokens'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();

    if (autoRefresh) {
      const interval = setInterval(fetchTokens, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchTokens, autoRefresh, refreshInterval]);

  return {
    tokens,
    isLoading,
    error,
    refetch: fetchTokens,
  };
}

interface UseTokenOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseTokenReturn {
  token: Token | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching a single token by symbol
 */
export function useToken(symbol: string, options: UseTokenOptions = {}): UseTokenReturn {
  const { autoRefresh = false, refreshInterval = 10000 } = options;
  
  const [token, setToken] = useState<Token | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchToken = useCallback(async () => {
    if (!symbol) {
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await api.getToken(symbol);
      setToken(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch token'));
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    setIsLoading(true);
    fetchToken();

    if (autoRefresh) {
      const interval = setInterval(fetchToken, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchToken, autoRefresh, refreshInterval]);

  return {
    token,
    isLoading,
    error,
    refetch: fetchToken,
  };
}

interface UseOHLCVOptions {
  interval?: TimeInterval;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseOHLCVReturn {
  data: OHLCV[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching OHLCV (candlestick) data for a token
 */
export function useOHLCV(symbol: string, options: UseOHLCVOptions = {}): UseOHLCVReturn {
  const {
    interval = '1h',
    limit = 168,
    autoRefresh = false,
    refreshInterval = 60000,
  } = options;

  const [data, setData] = useState<OHLCV[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOHLCV = useCallback(async () => {
    if (!symbol) {
      setData([]);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const ohlcvData = await api.getTokenOHLCV(symbol, interval, limit);
      setData(ohlcvData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch OHLCV data'));
    } finally {
      setIsLoading(false);
    }
  }, [symbol, interval, limit]);

  useEffect(() => {
    setIsLoading(true);
    fetchOHLCV();

    if (autoRefresh) {
      const intervalId = setInterval(fetchOHLCV, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [fetchOHLCV, autoRefresh, refreshInterval]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchOHLCV,
  };
}

export default useTokens;