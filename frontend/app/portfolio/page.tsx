'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { api } from '@/lib/api';
import { PortfolioSummary } from '@/components/PortfolioSummary';
import { TradeHistory } from '@/components/TradeHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePortfolioStore } from '@/stores/portfolio-store';
import { formatCurrency, formatPercentage, cn } from '@/lib/utils';

export default function PortfolioPage() {
  const { portfolio, trades } = usePortfolioStore();

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
        <PortfolioSummary portfolio={portfolio} />

        {/* Trade History */}
        <TradeHistory trades={trades} />
      </div>
    </div>
  );
}
