'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Search,
  Sparkles,
} from 'lucide-react';
import { Token, TableSortConfig } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  formatPrice,
  formatVolume,
  formatMarketCap,
  formatPercentage,
  formatCompactNumber,
  cn,
} from '@/lib/utils';

interface TokenTableProps {
  tokens: Token[];
  onAnalyze?: (symbol: string) => void;
  isLoading?: boolean;
}

export function TokenTable({ tokens, onAnalyze, isLoading }: TokenTableProps) {
  const router = useRouter();
  const [sortConfig, setSortConfig] = useState<TableSortConfig>({
    key: 'volume24h',
    direction: 'desc',
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Filter tokens by search
  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) return tokens;

    const query = searchQuery.toLowerCase();
    return tokens.filter(
      (token) =>
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query)
    );
  }, [tokens, searchQuery]);

  // Sort tokens
  const sortedTokens = useMemo(() => {
    const sorted = [...filteredTokens];
    sorted.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });
    return sorted;
  }, [filteredTokens, sortConfig]);

  const handleSort = (key: keyof Token) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof Token }) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="ml-1 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4" />
    );
  };

  const handleRowClick = (symbol: string) => {
    router.push(`/tokens/${symbol}`);
  };

  if (isLoading) {
    return <TokenTableSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tokens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline" className="text-xs">
          {sortedTokens.length} tokens
        </Badge>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium text-sm">Token</th>
                <th className="text-right p-4 font-medium text-sm">
                  <button
                    onClick={() => handleSort('price')}
                    className="inline-flex items-center hover:text-foreground"
                  >
                    Price
                    <SortIcon columnKey="price" />
                  </button>
                </th>
                <th className="text-right p-4 font-medium text-sm">
                  <button
                    onClick={() => handleSort('priceChange24h')}
                    className="inline-flex items-center hover:text-foreground"
                  >
                    24h
                    <SortIcon columnKey="priceChange24h" />
                  </button>
                </th>
                <th className="text-right p-4 font-medium text-sm">
                  <button
                    onClick={() => handleSort('priceChange7d')}
                    className="inline-flex items-center hover:text-foreground"
                  >
                    7d
                    <SortIcon columnKey="priceChange7d" />
                  </button>
                </th>
                <th className="text-right p-4 font-medium text-sm">
                  <button
                    onClick={() => handleSort('volume24h')}
                    className="inline-flex items-center hover:text-foreground"
                  >
                    Volume
                    <SortIcon columnKey="volume24h" />
                  </button>
                </th>
                <th className="text-right p-4 font-medium text-sm">
                  <button
                    onClick={() => handleSort('liquidity')}
                    className="inline-flex items-center hover:text-foreground"
                  >
                    Liquidity
                    <SortIcon columnKey="liquidity" />
                  </button>
                </th>
                <th className="text-right p-4 font-medium text-sm">
                  <button
                    onClick={() => handleSort('marketCap')}
                    className="inline-flex items-center hover:text-foreground"
                  >
                    Market Cap
                    <SortIcon columnKey="marketCap" />
                  </button>
                </th>
                <th className="text-center p-4 font-medium text-sm">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedTokens.map((token, index) => (
                <tr
                  key={token.symbol}
                  className={cn(
                    'border-t hover:bg-muted/30 cursor-pointer transition-colors',
                    index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                  )}
                  onClick={() => handleRowClick(token.symbol)}
                >
                  {/* Token */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-solana to-solana-light flex items-center justify-center text-white font-bold text-xs">
                        {token.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-medium">{token.symbol}</div>
                        <div className="text-xs text-muted-foreground">
                          {token.name}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="p-4 text-right font-mono">
                    {formatPrice(token.price)}
                  </td>

                  {/* 24h Change */}
                  <td className="p-4 text-right">
                    <PriceChangeBadge value={token.priceChange24h} />
                  </td>

                  {/* 7d Change */}
                  <td className="p-4 text-right">
                    <PriceChangeBadge value={token.priceChange7d} />
                  </td>

                  {/* Volume */}
                  <td className="p-4 text-right font-mono text-sm">
                    {formatVolume(token.volume24h)}
                  </td>

                  {/* Liquidity */}
                  <td className="p-4 text-right font-mono text-sm">
                    {formatVolume(token.liquidity)}
                  </td>

                  {/* Market Cap */}
                  <td className="p-4 text-right font-mono text-sm">
                    {formatMarketCap(token.marketCap)}
                  </td>

                  {/* Action */}
                  <td className="p-4 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAnalyze?.(token.symbol);
                      }}
                      className="gap-1"
                    >
                      <Sparkles className="h-3 w-3" />
                      Analyze
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedTokens.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            No tokens found matching &quot;{searchQuery}&quot;
          </div>
        )}
      </div>
    </div>
  );
}

// Price Change Badge Component
function PriceChangeBadge({ value }: { value: number }) {
  const isPositive = value >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-sm font-medium',
        isPositive ? 'text-bullish' : 'text-bearish'
      )}
    >
      <Icon className="h-3 w-3" />
      {formatPercentage(value)}
    </span>
  );
}

// Loading Skeleton
function TokenTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="h-10 w-64 bg-muted animate-pulse rounded-md" />
        <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
      </div>
      <div className="rounded-lg border overflow-hidden">
        <div className="bg-muted/50 p-4">
          <div className="flex gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-4 w-20 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border-t p-4">
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 bg-muted animate-pulse rounded-full" />
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="flex-1" />
              {[...Array(6)].map((_, j) => (
                <div key={j} className="h-4 w-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TokenTable;
