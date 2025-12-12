'use client';

import React from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Users,
  Droplets,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn, formatCurrency, formatCompactNumber, formatPercentage } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  icon,
  prefix,
  suffix,
  className,
}: StatCardProps) {
  const hasChange = change !== undefined;
  const isPositive = change ? change >= 0 : true;

  return (
    <Card className={cn('', className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{title}</span>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold">
            {prefix}
            {typeof value === 'number' ? formatCompactNumber(value) : value}
            {suffix}
          </span>
          {hasChange && (
            <span
              className={cn(
                'flex items-center text-sm font-medium',
                isPositive ? 'text-bullish' : 'text-bearish'
              )}
            >
              {isPositive ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              {formatPercentage(change)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface MarketStatsProps {
  totalVolume24h: number;
  totalMarketCap: number;
  totalLiquidity: number;
  activeTokens: number;
  volumeChange?: number;
  marketCapChange?: number;
}

export function MarketStats({
  totalVolume24h,
  totalMarketCap,
  totalLiquidity,
  activeTokens,
  volumeChange,
  marketCapChange,
}: MarketStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        title="24h Volume"
        value={totalVolume24h}
        change={volumeChange}
        prefix="$"
        icon={<BarChart3 className="h-4 w-4" />}
      />
      <StatCard
        title="Market Cap"
        value={totalMarketCap}
        change={marketCapChange}
        prefix="$"
        icon={<DollarSign className="h-4 w-4" />}
      />
      <StatCard
        title="Total Liquidity"
        value={totalLiquidity}
        prefix="$"
        icon={<Droplets className="h-4 w-4" />}
      />
      <StatCard
        title="Active Tokens"
        value={activeTokens}
        icon={<Users className="h-4 w-4" />}
      />
    </div>
  );
}

interface TrendingTokenCardProps {
  rank: number;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  onClick?: () => void;
}

export function TrendingTokenCard({
  rank,
  symbol,
  name,
  price,
  change24h,
  volume24h,
  onClick,
}: TrendingTokenCardProps) {
  const isPositive = change24h >= 0;

  return (
    <Card
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Rank */}
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
            {rank}
          </div>

          {/* Token Icon */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-solana to-solana-light flex items-center justify-center text-white font-bold text-sm">
            {symbol.slice(0, 2)}
          </div>

          {/* Token Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-medium truncate">{symbol}</span>
              <span className="font-mono text-sm">
                ${price < 0.01 ? price.toExponential(2) : price.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate">{name}</span>
              <span
                className={cn(
                  'flex items-center gap-0.5',
                  isPositive ? 'text-bullish' : 'text-bearish'
                )}
              >
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {formatPercentage(change24h)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface AlertBannerProps {
  type: 'info' | 'warning' | 'success' | 'error';
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function AlertBanner({ type, message, action }: AlertBannerProps) {
  const styles = {
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-600',
    warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600',
    success: 'bg-bullish/10 border-bullish/20 text-bullish',
    error: 'bg-bearish/10 border-bearish/20 text-bearish',
  };

  return (
    <div className={cn('border rounded-lg p-4 flex items-center justify-between', styles[type])}>
      <span className="text-sm">{message}</span>
      {action && (
        <button
          onClick={action.onClick}
          className="text-sm font-medium underline underline-offset-4 hover:no-underline"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export default StatCard;
