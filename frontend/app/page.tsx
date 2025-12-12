'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, RefreshCw, TrendingUp, Bot } from 'lucide-react';
import { Token, AnalysisResponse, TradeRequest, TradeResponse } from '@/types';
import { api, analyzeToken } from '@/lib/api';
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
import { usePortfolioStore } from '@/stores/portfolio-store';

export default function DashboardPage() {
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { portfolio, trades, executeTrade, refreshPortfolio } = usePortfolioStore();

  // Fetch tokens
  const {
    data: tokens = [],
    isLoading: tokensLoading,
    refetch: refetchTokens,
  } = useQuery({
    queryKey: ['tokens'],
    queryFn: () => api.getTokens(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch OHLCV for selected token
  const { data: ohlcv = [], isLoading: ohlcvLoading } = useQuery({
    queryKey: ['ohlcv', selectedToken?.symbol],
    queryFn: () =>
      selectedToken ? api.getTokenOHLCV(selectedToken.symbol) : Promise.resolve([]),
    enabled: !!selectedToken,
  });

  // Calculate market stats
  const marketStats = React.useMemo(() => {
    if (!tokens.length) return null;

    return {
      totalVolume24h: tokens.reduce((sum, t) => sum + t.volume24h, 0),
      totalMarketCap: tokens.reduce((sum, t) => sum + t.marketCap, 0),
      totalLiquidity: tokens.reduce((sum, t) => sum + t.liquidity, 0),
      activeTokens: tokens.length,
      volumeChange: 12.5, // Mock value
      marketCapChange: 5.3, // Mock value
    };
  }, [tokens]);

  // Handle token analysis
  const handleAnalyze = async (symbol: string) => {
    setIsAnalyzing(true);
    setAnalysis(null);

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
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle trade
  const handleTrade = async (request: TradeRequest): Promise<TradeResponse> => {
    const price = tokens.find((t) => t.symbol === request.symbol)?.price || 0;
    const result = await executeTrade(request.symbol, request.type, request.amount, price);
    return result;
  };

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
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Market Stats */}
      {marketStats && <MarketStats {...marketStats} />}

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
              <TokenTable
                tokens={tokens}
                onAnalyze={handleAnalyze}
                isLoading={tokensLoading}
              />
            </CardContent>
          </Card>

          {/* Chart and Analysis */}
          {selectedToken && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <PriceChart
                symbol={selectedToken.symbol}
                data={ohlcv}
                isLoading={ohlcvLoading}
              />
              <AIAnalysisCard
                symbol={selectedToken.symbol}
                analysis={analysis}
                isLoading={isAnalyzing}
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
            onSelectHolding={(symbol) => {
              const token = tokens.find((t) => t.symbol === symbol);
              if (token) setSelectedToken(token);
            }}
          />

          {/* Trade Form */}
          <TradeForm
            token={selectedToken}
            cashBalance={portfolio?.cashBalance}
            tokenBalance={
              portfolio?.holdings.find((h) => h.symbol === selectedToken?.symbol)
                ?.amount || 0
            }
            onTrade={handleTrade}
          />

          {/* Recent Trades */}
          <TradeHistory trades={trades} limit={5} />
        </div>
      </div>
    </div>
  );
}
