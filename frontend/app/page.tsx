'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, RefreshCw, TrendingUp, Bot, AlertTriangle, WifiOff } from 'lucide-react';
import { Token, AnalysisResponse, TradeRequest, TradeResponse } from '@/types';
import { api, analyzeToken, APIError } from '@/lib/api';
import { TokenTable } from '@/components/TokenTable';
import { PriceChart } from '@/components/PriceChart';
import { AIAnalysisCard } from '@/components/AIAnalysisCard';
import { TradeForm } from '@/components/TradeForm';
import { PortfolioSummary } from '@/components/PortfolioSummary';
import { MarketStats } from '@/components/StatCards';
import { TradeHistory } from '@/components/TradeHistory';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { usePortfolioStore } from '@/stores/portfolio-store';

export default function DashboardPage() {
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const { portfolio, trades, isLoading, error: portfolioError, executeTrade, refreshPortfolio } = usePortfolioStore();

  // Fetch tokens from real API - no mock fallback
  const {
    data: tokens = [],
    isLoading: tokensLoading,
    error: tokensError,
    refetch: refetchTokens,
  } = useQuery({
    queryKey: ['tokens'],
    queryFn: () => api.getTokens(),
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 2, // Retry twice before showing error
  });

  // Fetch OHLCV for selected token - no mock fallback
  const { data: ohlcv = [], isLoading: ohlcvLoading, error: ohlcvError } = useQuery({
    queryKey: ['ohlcv', selectedToken?.symbol],
    queryFn: () =>
      selectedToken ? api.getTokenOHLCV(selectedToken.symbol) : Promise.resolve([]),
    enabled: !!selectedToken,
    retry: 1,
  });

  // Calculate market stats from real data only - no mock values
  const marketStats = React.useMemo(() => {
    if (!tokens.length) return null;

    return {
      totalVolume24h: tokens.reduce((sum, t) => sum + (t.volume24h || 0), 0),
      totalMarketCap: tokens.reduce((sum, t) => sum + (t.marketCap || 0), 0),
      totalLiquidity: tokens.reduce((sum, t) => sum + (t.liquidity || 0), 0),
      activeTokens: tokens.length,
      // These values are calculated from real data, set to 0 if not available
      volumeChange: 0,
      marketCapChange: 0,
    };
  }, [tokens]);

  // Handle token analysis - with proper error handling
  const handleAnalyze = async (symbol: string) => {
    setIsAnalyzing(true);
    setAnalysis(null);
    setAnalysisError(null);

    // Find and select the token
    const token = tokens.find((t) => t.symbol === symbol);
    if (token) {
      setSelectedToken(token);
    }

    try {
      const result = await analyzeToken(symbol);
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis failed:', error);
      setAnalysisError(error instanceof Error ? error.message : 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle trade
  const handleTrade = async (request: TradeRequest): Promise<TradeResponse> => {
    const price = tokens.find((t) => t.symbol === request.symbol)?.price || 0;
    if (price === 0) {
      throw new Error('Cannot trade: Unable to determine token price');
    }
    const result = await executeTrade(request.symbol, request.type, request.amount, price);
    return result;
  };

  // Initialize portfolio from API on mount
  useEffect(() => {
    const initializePortfolio = async () => {
      const store = usePortfolioStore.getState();
      if (!store.isInitialized) {
        await store.initialize();
      }
    };
    initializePortfolio();
  }, []);

  // Select first token on load
  useEffect(() => {
    if (tokens.length > 0 && !selectedToken) {
      setSelectedToken(tokens[0]);
    }
  }, [tokens, selectedToken]);

  return (
    <div className="container py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8 text-solana" />
            Meme Trading Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered trading analysis for Solana meme coins
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchTokens()}
          className="gap-2"
          disabled={tokensLoading}
        >
          <RefreshCw className={`h-4 w-4 ${tokensLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* API Error Alert - Critical for financial application */}
      {tokensError && (
        <Alert variant="destructive">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>Unable to Load Market Data</AlertTitle>
          <AlertDescription>
            {tokensError instanceof Error ? tokensError.message : 'Failed to connect to trading server. Please check your connection and try again.'}
            <Button variant="outline" size="sm" className="ml-4" onClick={() => refetchTokens()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Portfolio Error Alert */}
      {portfolioError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Portfolio Data Unavailable</AlertTitle>
          <AlertDescription>
            {portfolioError}
            <Button variant="outline" size="sm" className="ml-4" onClick={() => refreshPortfolio()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Market Stats - Only show if we have real data */}
      {marketStats && !tokensError && <MarketStats {...marketStats} />}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Token Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Token Table */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Trending Meme Coins
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {tokensError ? (
                <div className="text-center py-12">
                  <WifiOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Unable to load tokens</p>
                  <p className="text-sm text-muted-foreground mt-1">Please check your connection to the trading server</p>
                </div>
              ) : (
                <TokenTable
                  tokens={tokens}
                  onAnalyze={handleAnalyze}
                  isLoading={tokensLoading}
                />
              )}
            </CardContent>
          </Card>

          {/* Chart and Analysis - only show with real data */}
          {selectedToken && !tokensError && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <PriceChart
                symbol={selectedToken.symbol}
                data={ohlcv}
                isLoading={ohlcvLoading}
                error={ohlcvError instanceof Error ? ohlcvError.message : undefined}
              />
              <AIAnalysisCard
                symbol={selectedToken.symbol}
                analysis={analysis}
                isLoading={isAnalyzing}
                error={analysisError}
                onTrade={(decision) => {
                  // Open trade form with decision
                }}
              />
            </div>
          )}
        </div>

        {/* Right Column - Portfolio & Trade */}
        <div className="space-y-6">
          {/* Portfolio Summary */}
          <PortfolioSummary
            portfolio={portfolio}
            isLoading={isLoading}
            error={portfolioError}
            onSelectHolding={(symbol) => {
              const token = tokens.find((t) => t.symbol === symbol);
              if (token) setSelectedToken(token);
            }}
          />

          {/* Trade Form - only show if we have real data */}
          {!tokensError && (
            <TradeForm
              token={selectedToken}
              cashBalance={portfolio?.cashBalance}
              tokenBalance={
                portfolio?.holdings.find((h) => h.symbol === selectedToken?.symbol)
                  ?.amount || 0
              }
              onTrade={handleTrade}
            />
          )}

          {/* Recent Trades */}
          <TradeHistory trades={trades} limit={5} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
