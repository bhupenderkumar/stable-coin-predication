'use client';

import { useState, useCallback } from 'react';
import { AnalysisResponse, Token } from '@/types';
import { api } from '@/lib/api';

interface UseAnalysisReturn {
  analysis: AnalysisResponse | null;
  isLoading: boolean;
  error: Error | null;
  analyze: (symbol: string) => Promise<AnalysisResponse | null>;
  reset: () => void;
}

/**
 * Hook for AI-powered token analysis
 */
export function useAnalysis(): UseAnalysisReturn {
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const analyze = useCallback(async (symbol: string): Promise<AnalysisResponse | null> => {
    if (!symbol) {
      setError(new Error('Symbol is required'));
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await api.analyzeToken(symbol);
      setAnalysis(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Analysis failed');
      setError(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setAnalysis(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    analysis,
    isLoading,
    error,
    analyze,
    reset,
  };
}

interface AnalysisHistoryItem {
  symbol: string;
  analysis: AnalysisResponse;
  timestamp: number;
}

interface UseAnalysisHistoryReturn {
  history: AnalysisHistoryItem[];
  addToHistory: (symbol: string, analysis: AnalysisResponse) => void;
  clearHistory: () => void;
  getLastAnalysis: (symbol: string) => AnalysisHistoryItem | undefined;
}

/**
 * Hook for managing analysis history
 */
export function useAnalysisHistory(): UseAnalysisHistoryReturn {
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);

  const addToHistory = useCallback((symbol: string, analysis: AnalysisResponse) => {
    setHistory((prev) => {
      // Remove old analysis for the same symbol
      const filtered = prev.filter((item) => item.symbol !== symbol);
      // Add new analysis at the beginning
      return [
        { symbol, analysis, timestamp: Date.now() },
        ...filtered,
      ].slice(0, 50); // Keep last 50 analyses
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const getLastAnalysis = useCallback(
    (symbol: string) => {
      return history.find((item) => item.symbol === symbol);
    },
    [history]
  );

  return {
    history,
    addToHistory,
    clearHistory,
    getLastAnalysis,
  };
}

interface UseBatchAnalysisReturn {
  results: Map<string, AnalysisResponse>;
  isLoading: boolean;
  progress: number;
  error: Error | null;
  analyzeMultiple: (symbols: string[]) => Promise<void>;
  reset: () => void;
}

/**
 * Hook for batch token analysis
 */
export function useBatchAnalysis(): UseBatchAnalysisReturn {
  const [results, setResults] = useState<Map<string, AnalysisResponse>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const analyzeMultiple = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return;

    setIsLoading(true);
    setError(null);
    setProgress(0);
    setResults(new Map());

    const newResults = new Map<string, AnalysisResponse>();
    let completed = 0;

    try {
      // Analyze tokens sequentially to avoid rate limiting
      for (const symbol of symbols) {
        try {
          const result = await api.analyzeToken(symbol);
          newResults.set(symbol, result);
          setResults(new Map(newResults));
        } catch (err) {
          console.error(`Failed to analyze ${symbol}:`, err);
        }
        
        completed++;
        setProgress((completed / symbols.length) * 100);
        
        // Add small delay between requests
        if (completed < symbols.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Batch analysis failed'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResults(new Map());
    setProgress(0);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    results,
    isLoading,
    progress,
    error,
    analyzeMultiple,
    reset,
  };
}

interface UseTokenWithAnalysisReturn {
  token: Token | null;
  analysis: AnalysisResponse | null;
  isLoadingToken: boolean;
  isLoadingAnalysis: boolean;
  error: Error | null;
  analyze: () => Promise<void>;
  refetchToken: () => Promise<void>;
}

/**
 * Combined hook for token data with analysis
 */
export function useTokenWithAnalysis(symbol: string): UseTokenWithAnalysisReturn {
  const [token, setToken] = useState<Token | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchToken = useCallback(async () => {
    if (!symbol) return;

    setIsLoadingToken(true);
    try {
      const data = await api.getToken(symbol);
      setToken(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch token'));
    } finally {
      setIsLoadingToken(false);
    }
  }, [symbol]);

  const analyze = useCallback(async () => {
    if (!symbol) return;

    setIsLoadingAnalysis(true);
    setError(null);
    
    try {
      const result = await api.analyzeToken(symbol);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Analysis failed'));
    } finally {
      setIsLoadingAnalysis(false);
    }
  }, [symbol]);

  // Fetch token on mount
  useState(() => {
    fetchToken();
  });

  return {
    token,
    analysis,
    isLoadingToken,
    isLoadingAnalysis,
    error,
    analyze,
    refetchToken: fetchToken,
  };
}

export default useAnalysis;