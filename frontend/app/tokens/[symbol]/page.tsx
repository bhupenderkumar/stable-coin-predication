'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { api, analyzeToken } from '@/lib/api';
import { TimeInterval, AnalysisResponse, TradeRequest, TradeResponse } from '@/types';
import { PriceChart } from '@/components/PriceChart';
import { AIAnalysisCard } from '@/components/AIAnalysisCard';
import { TradeForm } from '@/components/TradeForm';
import { TradeHistory } from '@/components/TradeHistory';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { usePortfolioStore } from '@/stores/portfolio-store';
import {
  formatPrice,
  formatVolume,
  formatMarketCap,
  formatPercentage,
  formatCompactNumber,
  shortenAddress,
  copyToClipboard,
  cn,
} from '@/lib/utils';

export default function TokenDetailPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = params.symbol as string;

  const [interval, setInterval] = useState<TimeInterval>('1h');
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);

  const { portfolio, trades, executeTrade } = usePortfolioStore();

  // Fetch token details
  const {
    data: token,
    isLoading: tokenLoading,
    refetch: refetchToken,
  } = useQuery({
    queryKey: ['token', symbol],
    queryFn: () => api.getToken(symbol),
    enabled: !!symbol,
  });

  // Fetch OHLCV data
  const {
    data: ohlcv = [],
    isLoading: ohlcvLoading,
    refetch: refetchOhlcv,
  } = useQuery({
    queryKey: ['ohlcv', symbol, interval],
    queryFn: () => api.getTokenOHLCV(symbol, interval),
    enabled: !!symbol,
  });

  // Handle analyze
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeToken(symbol);
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle copy address
  const handleCopyAddress = async () => {
    if (token?.mintAddress) {
      await copyToClipboard(token.mintAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle trade
  const handleTrade = async (request: TradeRequest): Promise<TradeResponse> => {
    const price = token?.price || 0;
    const result = await executeTrade(request.symbol, request.type, request.amount, price);
    return result;
  };

  // Filter trades for this token
  const tokenTrades = trades.filter((t) => t.symbol === symbol);

  // Get holding for this token
  const holding = portfolio?.holdings.find((h) => h.symbol === symbol);

  if (tokenLoading) {
    return <TokenDetailSkeleton />;
  }

  if (!token) {
    return (
      <div className="container py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Token Not Found</h1>
        <p className="text-muted-foreground mb-4">
          The token &quot;{symbol}&quot; could not be found.
        </p>
        <Button onClick={() => router.push('/')}>Back to Dashboard</Button>
      </div>
    );
  }

  const isPositive24h = token.priceChange24h >= 0;
  const isPositive7d = token.priceChange7d >= 0;

  return (
    <div className="container py-6 space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/')}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Button>

      {/* Token Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Token Icon */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-solana to-solana-light flex items-center justify-center text-white font-bold text-xl">
            {token.symbol.slice(0, 2)}
          </div>

          {/* Token Info */}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{token.symbol}</h1>
              <Badge variant="outline">{token.name}</Badge>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>{shortenAddress(token.mintAddress, 6)}</span>
              <button
                onClick={handleCopyAddress}
                className="hover:text-foreground transition-colors"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-bullish" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
              <a
                href={`https://solscan.io/token/${token.mintAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Price Info */}
        <div className="text-left md:text-right">
          <div className="text-3xl font-bold font-mono">
            {formatPrice(token.price)}
          </div>
          <div className="flex items-center gap-4 mt-1">
            <span
              className={cn(
                'text-sm font-medium',
                isPositive24h ? 'text-bullish' : 'text-bearish'
              )}
            >
              24h: {formatPercentage(token.priceChange24h)}
            </span>
            <span
              className={cn(
                'text-sm font-medium',
                isPositive7d ? 'text-bullish' : 'text-bearish'
              )}
            >
              7d: {formatPercentage(token.priceChange7d)}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Market Cap</p>
            <p className="text-lg font-bold">{formatMarketCap(token.marketCap)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">24h Volume</p>
            <p className="text-lg font-bold">{formatVolume(token.volume24h)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Liquidity</p>
            <p className="text-lg font-bold">{formatVolume(token.liquidity)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Holders</p>
            <p className="text-lg font-bold">{formatCompactNumber(token.holders)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Your Balance</p>
            <p className="text-lg font-bold">
              {holding ? formatCompactNumber(holding.amount) : '0'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Chart & Analysis */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart */}
          <PriceChart
            symbol={token.symbol}
            data={ohlcv}
            isLoading={ohlcvLoading}
            currentInterval={interval}
            onIntervalChange={setInterval}
          />

          {/* Analyze Button */}
          <div className="flex items-center gap-4">
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="gap-2"
              size="lg"
            >
              <Sparkles className="h-4 w-4" />
              {isAnalyzing ? 'Analyzing...' : 'Run AI Analysis'}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                refetchToken();
                refetchOhlcv();
              }}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Data
            </Button>
          </div>

          {/* AI Analysis */}
          <AIAnalysisCard
            symbol={token.symbol}
            analysis={analysis}
            isLoading={isAnalyzing}
          />
        </div>

        {/* Right Column - Trade & History */}
        <div className="space-y-6">
          {/* Trade Form */}
          <TradeForm
            token={token}
            cashBalance={portfolio?.cashBalance}
            tokenBalance={holding?.amount || 0}
            onTrade={handleTrade}
          />

          {/* Trade History for this token */}
          <TradeHistory trades={tokenTrades} />
        </div>
      </div>
    </div>
  );
}

function TokenDetailSkeleton() {
  return (
    <div className="container py-6 space-y-6">
      <div className="h-8 w-32 bg-muted animate-pulse rounded" />
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 bg-muted animate-pulse rounded-full" />
        <div className="space-y-2">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          <div className="h-4 w-48 bg-muted animate-pulse rounded" />
        </div>
      </div>
      <div className="grid grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
      <div className="h-96 bg-muted animate-pulse rounded-lg" />
    </div>
  );
}
