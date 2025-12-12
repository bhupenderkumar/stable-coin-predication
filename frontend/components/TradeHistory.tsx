'use client';

import React from 'react';
import { Trade } from '@/types';
import {
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency, formatPrice, timeAgo } from '@/lib/utils';

interface TradeHistoryProps {
  trades: Trade[];
  isLoading?: boolean;
  limit?: number;
}

export function TradeHistory({ trades, isLoading, limit }: TradeHistoryProps) {
  const displayTrades = limit ? trades.slice(0, limit) : trades;

  if (isLoading) {
    return <TradeHistorySkeleton />;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Trade History
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {trades.length} trades
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {displayTrades.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No trades yet</p>
            <p className="text-xs mt-1">Your trade history will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayTrades.map((trade) => (
              <TradeRow key={trade.id} trade={trade} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TradeRowProps {
  trade: Trade;
}

function TradeRow({ trade }: TradeRowProps) {
  const isBuy = trade.type === 'BUY';
  const isSuccess = trade.status === 'EXECUTED';
  const isFailed = trade.status === 'FAILED';
  const isPending = trade.status === 'PENDING';

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border',
        isSuccess && 'bg-card',
        isFailed && 'bg-bearish/5 border-bearish/20',
        isPending && 'bg-yellow-500/5 border-yellow-500/20'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Trade Type Icon */}
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center',
            isBuy ? 'bg-bullish/10' : 'bg-bearish/10'
          )}
        >
          {isBuy ? (
            <ArrowUpRight className={cn('h-4 w-4', 'text-bullish')} />
          ) : (
            <ArrowDownRight className={cn('h-4 w-4', 'text-bearish')} />
          )}
        </div>

        {/* Trade Info */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{trade.symbol}</span>
            <Badge
              variant={isBuy ? 'success' : 'danger'}
              className="text-xs px-1.5 py-0"
            >
              {trade.type}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {timeAgo(trade.timestamp)}
          </div>
        </div>
      </div>

      {/* Trade Details */}
      <div className="text-right">
        <div className="flex items-center gap-2 justify-end">
          <span className="font-mono text-sm">
            {isBuy
              ? `+${trade.amountOut.toLocaleString(undefined, { maximumFractionDigits: 4 })}`
              : formatCurrency(trade.amountOut)}
          </span>
          {/* Status Icon */}
          {isSuccess && <CheckCircle className="h-4 w-4 text-bullish" />}
          {isFailed && <XCircle className="h-4 w-4 text-bearish" />}
          {isPending && <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />}
        </div>
        <div className="text-xs text-muted-foreground">
          @ {formatPrice(trade.price)}
        </div>
      </div>
    </div>
  );
}

function TradeHistorySkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="h-5 w-32 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
              <div>
                <div className="h-4 w-16 bg-muted animate-pulse rounded mb-1" />
                <div className="h-3 w-12 bg-muted animate-pulse rounded" />
              </div>
            </div>
            <div className="text-right">
              <div className="h-4 w-20 bg-muted animate-pulse rounded mb-1" />
              <div className="h-3 w-16 bg-muted animate-pulse rounded" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default TradeHistory;
