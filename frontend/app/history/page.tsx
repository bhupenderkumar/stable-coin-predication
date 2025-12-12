'use client';

import React from 'react';
import { History, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { usePortfolioStore } from '@/stores/portfolio-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatPrice, cn } from '@/lib/utils';

export default function HistoryPage() {
  const { trades } = usePortfolioStore();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'EXECUTED':
        return <CheckCircle2 className="h-4 w-4 text-bullish" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-bearish" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'EXECUTED':
        return <Badge className="bg-bullish/20 text-bullish">Executed</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-500/20 text-yellow-500">Pending</Badge>;
      case 'FAILED':
        return <Badge className="bg-bearish/20 text-bearish">Failed</Badge>;
      default:
        return null;
    }
  };

  // Calculate stats
  const executedTrades = trades.filter((t) => t.status === 'EXECUTED');
  const buyTrades = executedTrades.filter((t) => t.type === 'BUY');
  const sellTrades = executedTrades.filter((t) => t.type === 'SELL');
  const totalBuyVolume = buyTrades.reduce((sum, t) => sum + t.amountIn, 0);
  const totalSellVolume = sellTrades.reduce((sum, t) => sum + t.amountOut, 0);

  return (
    <div className="container py-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <History className="h-8 w-8 text-solana" />
          Trade History
        </h1>
        <p className="text-muted-foreground mt-1">
          View all your past trades and transactions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Trades</p>
            <p className="text-2xl font-bold">{executedTrades.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Buy Orders</p>
            <p className="text-2xl font-bold text-bullish">{buyTrades.length}</p>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(totalBuyVolume)} volume
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Sell Orders</p>
            <p className="text-2xl font-bold text-bearish">{sellTrades.length}</p>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(totalSellVolume)} volume
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Net Flow</p>
            <p
              className={cn(
                'text-2xl font-bold',
                totalSellVolume - totalBuyVolume >= 0
                  ? 'text-bullish'
                  : 'text-bearish'
              )}
            >
              {formatCurrency(Math.abs(totalSellVolume - totalBuyVolume))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trade List */}
      <Card>
        <CardHeader>
          <CardTitle>All Trades</CardTitle>
        </CardHeader>
        <CardContent>
          {trades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No trades yet. Start trading to see your history.
            </div>
          ) : (
            <div className="space-y-2">
              {trades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(trade.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{trade.symbol}</span>
                        <Badge
                          className={cn(
                            trade.type === 'BUY'
                              ? 'bg-bullish/20 text-bullish'
                              : 'bg-bearish/20 text-bearish'
                          )}
                        >
                          {trade.type}
                        </Badge>
                        {getStatusBadge(trade.status)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(trade.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      {trade.type === 'BUY' ? (
                        <ArrowDownRight className="h-4 w-4 text-bearish" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-bullish" />
                      )}
                      <span className="font-medium">
                        {formatCurrency(trade.amountIn)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {trade.amountOut.toLocaleString()} @ {formatPrice(trade.price)}
                    </div>
                  </div>

                  {trade.txHash && (
                    <div className="hidden md:block">
                      <a
                        href={`https://solscan.io/tx/${trade.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-solana hover:underline"
                      >
                        {trade.txHash.slice(0, 8)}...
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
