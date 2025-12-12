'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Bar,
  BarChart,
  ComposedChart,
} from 'recharts';
import { OHLCV, TimeInterval } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatPrice, formatCompactNumber, cn } from '@/lib/utils';

interface PriceChartProps {
  symbol: string;
  data: OHLCV[];
  isLoading?: boolean;
  onIntervalChange?: (interval: TimeInterval) => void;
  currentInterval?: TimeInterval;
}

const INTERVALS: { value: TimeInterval; label: string }[] = [
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
];

export function PriceChart({
  symbol,
  data,
  isLoading,
  onIntervalChange,
  currentInterval = '1h',
}: PriceChartProps) {
  const [chartType, setChartType] = useState<'line' | 'candle' | 'area'>('area');

  // Transform data for charts
  const chartData = data.map((candle) => ({
    time: new Date(candle.timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    timestamp: candle.timestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
    // For candlestick visualization
    bullish: candle.close >= candle.open,
    body: Math.abs(candle.close - candle.open),
    wick: candle.high - candle.low,
  }));

  // Calculate price change
  const firstPrice = chartData[0]?.close || 0;
  const lastPrice = chartData[chartData.length - 1]?.close || 0;
  const priceChange = lastPrice - firstPrice;
  const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  // Get min/max for Y axis
  const prices = chartData.map((d) => d.close);
  const minPrice = Math.min(...prices) * 0.995;
  const maxPrice = Math.max(...prices) * 1.005;

  if (isLoading) {
    return <ChartSkeleton />;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="text-lg">{symbol} Price Chart</CardTitle>
            <div
              className={cn(
                'text-sm font-medium',
                isPositive ? 'text-bullish' : 'text-bearish'
              )}
            >
              {isPositive ? '+' : ''}
              {priceChangePercent.toFixed(2)}%
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Chart Type Toggle */}
            <Tabs value={chartType} onValueChange={(v) => setChartType(v as typeof chartType)}>
              <TabsList className="h-8">
                <TabsTrigger value="area" className="text-xs px-2">
                  Area
                </TabsTrigger>
                <TabsTrigger value="line" className="text-xs px-2">
                  Line
                </TabsTrigger>
                <TabsTrigger value="candle" className="text-xs px-2">
                  Candle
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Interval Toggle */}
            <Tabs
              value={currentInterval}
              onValueChange={(v) => onIntervalChange?.(v as TimeInterval)}
            >
              <TabsList className="h-8">
                {INTERVALS.map((interval) => (
                  <TabsTrigger
                    key={interval.value}
                    value={interval.value}
                    className="text-xs px-2"
                  >
                    {interval.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={isPositive ? '#10B981' : '#EF4444'}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={isPositive ? '#10B981' : '#EF4444'}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[minPrice, maxPrice]}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatPrice(value)}
                  width={80}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: '#6B7280', strokeDasharray: '5 5' }}
                />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke={isPositive ? '#10B981' : '#EF4444'}
                  strokeWidth={2}
                  fill="url(#colorPrice)"
                />
              </AreaChart>
            ) : chartType === 'line' ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[minPrice, maxPrice]}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatPrice(value)}
                  width={80}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: '#6B7280', strokeDasharray: '5 5' }}
                />
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke={isPositive ? '#10B981' : '#EF4444'}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            ) : (
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[minPrice, maxPrice]}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatPrice(value)}
                  width={80}
                />
                <Tooltip
                  content={<CandleTooltip />}
                  cursor={{ stroke: '#6B7280', strokeDasharray: '5 5' }}
                />
                {/* Render candlesticks as bars */}
                <Bar
                  dataKey="body"
                  fill="#10B981"
                  stroke="none"
                  // Custom shape for candlesticks would go here
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Volume Chart */}
        <div className="h-[80px] w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="time" hide />
              <YAxis hide />
              <Tooltip
                content={<VolumeTooltip />}
                cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }}
              />
              <Bar
                dataKey="volume"
                fill="#6B7280"
                opacity={0.5}
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Custom Tooltips
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border rounded-lg p-3 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-medium">{formatPrice(payload[0].value)}</p>
      </div>
    );
  }
  return null;
}

function CandleTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border rounded-lg p-3 shadow-lg">
        <p className="text-xs text-muted-foreground mb-2">{label}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span className="text-muted-foreground">Open:</span>
          <span className="font-mono">{formatPrice(data.open)}</span>
          <span className="text-muted-foreground">High:</span>
          <span className="font-mono">{formatPrice(data.high)}</span>
          <span className="text-muted-foreground">Low:</span>
          <span className="font-mono">{formatPrice(data.low)}</span>
          <span className="text-muted-foreground">Close:</span>
          <span className="font-mono">{formatPrice(data.close)}</span>
        </div>
      </div>
    );
  }
  return null;
}

function VolumeTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border rounded-lg p-2 shadow-lg">
        <p className="text-xs text-muted-foreground">Volume</p>
        <p className="text-sm font-medium">${formatCompactNumber(payload[0].value)}</p>
      </div>
    );
  }
  return null;
}

// Loading Skeleton
function ChartSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="h-6 w-40 bg-muted animate-pulse rounded" />
          <div className="flex gap-2">
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full bg-muted/30 animate-pulse rounded flex items-center justify-center">
          <span className="text-muted-foreground">Loading chart...</span>
        </div>
        <div className="h-[80px] w-full mt-2 bg-muted/30 animate-pulse rounded" />
      </CardContent>
    </Card>
  );
}

export default PriceChart;
