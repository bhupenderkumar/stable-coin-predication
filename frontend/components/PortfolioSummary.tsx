'use client';

import React from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Portfolio, Holding } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  cn,
  formatCurrency,
  formatPrice,
  formatPercentage,
  formatCompactNumber,
} from '@/lib/utils';

interface PortfolioSummaryProps {
  portfolio: Portfolio | null;
  isLoading?: boolean;
  onSelectHolding?: (symbol: string) => void;
}

export function PortfolioSummary({
  portfolio,
  isLoading,
  onSelectHolding,
}: PortfolioSummaryProps) {
  if (isLoading) {
    return <PortfolioSkeleton />;
  }

  if (!portfolio) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No portfolio data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { totalValue, cashBalance, pnl, pnlPercentage, holdings } = portfolio;
  const holdingsValue = totalValue - cashBalance;
  const isPositive = pnl >= 0;

  return (
    <div className="space-y-4">
      {/* Main Stats Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Portfolio
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Paper Trading
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Total Value */}
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-1">Total Value</p>
            <p className="text-3xl font-bold">{formatCurrency(totalValue)}</p>
            <div
              className={cn(
                'inline-flex items-center gap-1 text-sm font-medium mt-1',
                isPositive ? 'text-bullish' : 'text-bearish'
              )}
            >
              {isPositive ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              {formatCurrency(Math.abs(pnl))} ({formatPercentage(pnlPercentage)})
            </div>
          </div>

          <Separator />

          {/* Allocation Breakdown */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cash Balance</span>
              <span className="font-medium">{formatCurrency(cashBalance)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Holdings Value</span>
              <span className="font-medium">{formatCurrency(holdingsValue)}</span>
            </div>

            {/* Allocation Bar */}
            <div className="space-y-1">
              <div className="flex h-2 rounded-full overflow-hidden">
                <div
                  className="bg-solana"
                  style={{ width: `${(holdingsValue / totalValue) * 100}%` }}
                />
                <div
                  className="bg-muted"
                  style={{ width: `${(cashBalance / totalValue) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Holdings {((holdingsValue / totalValue) * 100).toFixed(0)}%</span>
                <span>Cash {((cashBalance / totalValue) * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Holdings List */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Holdings
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {holdings.length} tokens
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {holdings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No holdings yet</p>
              <p className="text-xs mt-1">Start trading to build your portfolio</p>
            </div>
          ) : (
            <div className="space-y-3">
              {holdings.map((holding) => (
                <HoldingCard
                  key={holding.symbol}
                  holding={holding}
                  totalValue={holdingsValue}
                  onClick={() => onSelectHolding?.(holding.symbol)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Individual Holding Card
interface HoldingCardProps {
  holding: Holding;
  totalValue: number;
  onClick?: () => void;
}

function HoldingCard({ holding, totalValue, onClick }: HoldingCardProps) {
  const { symbol, name, amount, value, avgBuyPrice, currentPrice, pnl, pnlPercentage } =
    holding;
  const isPositive = pnl >= 0;
  const allocation = (value / totalValue) * 100;

  return (
    <div
      className={cn(
        'p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer'
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-solana to-solana-light flex items-center justify-center text-white font-bold text-xs">
            {symbol.slice(0, 2)}
          </div>
          <div>
            <div className="font-medium text-sm">{symbol}</div>
            <div className="text-xs text-muted-foreground">{name}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-medium text-sm">{formatCurrency(value)}</div>
          <div
            className={cn(
              'text-xs flex items-center justify-end gap-0.5',
              isPositive ? 'text-bullish' : 'text-bearish'
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {formatPercentage(pnlPercentage)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground block">Amount</span>
          <span className="font-mono">{formatCompactNumber(amount)}</span>
        </div>
        <div>
          <span className="text-muted-foreground block">Avg. Buy</span>
          <span className="font-mono">{formatPrice(avgBuyPrice)}</span>
        </div>
        <div>
          <span className="text-muted-foreground block">Current</span>
          <span className="font-mono">{formatPrice(currentPrice)}</span>
        </div>
      </div>

      {/* Allocation Bar */}
      <div className="mt-2">
        <Progress value={allocation} className="h-1" />
        <span className="text-xs text-muted-foreground">
          {allocation.toFixed(1)}% of portfolio
        </span>
      </div>
    </div>
  );
}

// Loading Skeleton
function PortfolioSkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="h-5 w-24 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4">
            <div className="h-4 w-20 bg-muted animate-pulse rounded mx-auto mb-2" />
            <div className="h-8 w-32 bg-muted animate-pulse rounded mx-auto" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-4 w-16 bg-muted animate-pulse rounded" />
            </div>
            <div className="flex justify-between">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-4 w-16 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="h-5 w-20 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-3 border-b last:border-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
              </div>
              <div className="h-1 w-full bg-muted animate-pulse rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default PortfolioSummary;
