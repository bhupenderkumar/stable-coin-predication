'use client';

import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { api } from '@/lib/api';
import { PortfolioSummary } from '@/components/PortfolioSummary';
import { TradeHistory } from '@/components/TradeHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePortfolioStore } from '@/stores/portfolio-store';
import { formatCurrency, formatPercentage, cn } from '@/lib/utils';

export default function PortfolioPage() {
  const { portfolio, trades, isLoading, initialize, isInitialized } = usePortfolioStore();

  // Initialize portfolio from API on mount
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // Fetch tokens for navigation
  const { data: tokens = [] } = useQuery({
    queryKey: ['tokens'],
    queryFn: () => api.getTokens(),
  });

  // Calculate performance metrics
  const totalPnl = portfolio?.pnl || 0;
  const totalPnlPercent = portfolio?.pnlPercentage || 0;
  const winningTrades = trades.filter(
    (t) => t.status === 'EXECUTED' && t.type === 'SELL' && (t.pnl || 0) > 0
  ).length;
  const losingTrades = trades.filter(
    (t) => t.status === 'EXECUTED' && t.type === 'SELL' && (t.pnl || 0) < 0
  ).length;
  const totalExecutedTrades = trades.filter((t) => t.status === 'EXECUTED').length;

  return (
    <div className="container py-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Wallet className="h-8 w-8 text-solana" />
          Portfolio
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your holdings and performance
        </p>
      </div>

      {/* Paper Trading Notice */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💰</span>
          <div>
            <p className="font-medium text-yellow-600">Paper Trading Mode</p>
            <p className="text-sm text-muted-foreground">
              You start with $10,000 virtual money to practice trading. Prices are real market data from Solana DEXs.
              Your trades don&apos;t use real money - perfect for learning and testing strategies!
            </p>
          </div>
        </div>
      </div>

      {/* Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-2xl font-bold">
              {formatCurrency(portfolio?.totalValue || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total P&L</p>
            <div className="flex items-center gap-2">
              <p
                className={cn(
                  'text-2xl font-bold',
                  totalPnl >= 0 ? 'text-bullish' : 'text-bearish'
                )}
              >
                {formatCurrency(Math.abs(totalPnl))}
              </p>
              {totalPnl >= 0 ? (
                <ArrowUpRight className="h-5 w-5 text-bullish" />
              ) : (
                <ArrowDownRight className="h-5 w-5 text-bearish" />
              )}
            </div>
            <p
              className={cn(
                'text-sm',
                totalPnl >= 0 ? 'text-bullish' : 'text-bearish'
              )}
            >
              {formatPercentage(totalPnlPercent)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Trades</p>
            <p className="text-2xl font-bold">{totalExecutedTrades}</p>
            <p className="text-sm text-muted-foreground">
              {winningTrades}W / {losingTrades}L
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Cash Balance</p>
            <p className="text-2xl font-bold">
              {formatCurrency(portfolio?.cashBalance || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Summary */}
        <PortfolioSummary portfolio={portfolio} isLoading={isLoading} />

        {/* Trade History */}
        <TradeHistory trades={trades} isLoading={isLoading} />
      </div>
    </div>
  );
}
