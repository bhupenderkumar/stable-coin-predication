'use client';

import React from 'react';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Minus,
  Activity,
  BarChart3,
  Target,
} from 'lucide-react';
import { AnalysisResponse, RiskLevel, Decision } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  cn,
  getRiskLevelColor,
  getConfidenceColor,
  getRSIStatus,
  getVolumeTrendIcon,
  formatPrice,
} from '@/lib/utils';

interface AIAnalysisCardProps {
  symbol: string;
  analysis: AnalysisResponse | null;
  isLoading?: boolean;
  onTrade?: (decision: Decision) => void;
}

export function AIAnalysisCard({
  symbol,
  analysis,
  isLoading,
  onTrade,
}: AIAnalysisCardProps) {
  if (isLoading) {
    return <AnalysisSkeleton />;
  }

  if (!analysis) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Click &quot;Analyze&quot; to get AI-powered insights</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { decision, confidence, reasoning, riskLevel, indicators } = analysis;

  return (
    <Card className="overflow-hidden">
      {/* Header with Decision */}
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-solana" />
            <CardTitle className="text-lg">AI Analysis: {symbol}</CardTitle>
          </div>
          <DecisionBadge decision={decision} />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Confidence Meter */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Confidence Score</span>
            <span className={cn('font-bold', getConfidenceColor(confidence))}>
              {confidence}%
            </span>
          </div>
          <Progress
            value={confidence}
            className="h-2"
            indicatorClassName={cn(
              confidence >= 70
                ? 'bg-bullish'
                : confidence >= 50
                ? 'bg-yellow-500'
                : 'bg-bearish'
            )}
          />
        </div>

        {/* Risk Level */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Risk Level</span>
          <RiskBadge risk={riskLevel} />
        </div>

        <Separator />

        {/* Reasoning */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            Analysis Summary
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {reasoning}
          </p>
        </div>

        <Separator />

        {/* Technical Indicators */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Technical Indicators
          </h4>

          <div className="grid grid-cols-2 gap-4">
            {/* RSI */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">RSI (14)</span>
                <span className={cn('font-medium', getRSIStatus(indicators.rsi).color)}>
                  {indicators.rsi.toFixed(1)}
                </span>
              </div>
              <Progress
                value={indicators.rsi}
                className="h-1.5"
                indicatorClassName={cn(
                  indicators.rsi >= 70
                    ? 'bg-bearish'
                    : indicators.rsi <= 30
                    ? 'bg-bullish'
                    : 'bg-yellow-500'
                )}
              />
              <p className="text-xs text-muted-foreground">
                {getRSIStatus(indicators.rsi).label}
              </p>
            </div>

            {/* Volume Trend */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Volume Trend</span>
                <span className="font-medium">
                  {getVolumeTrendIcon(indicators.volumeTrend)}
                </span>
              </div>
              <div
                className={cn(
                  'text-sm font-medium',
                  indicators.volumeTrend === 'INCREASING'
                    ? 'text-bullish'
                    : indicators.volumeTrend === 'DECREASING'
                    ? 'text-bearish'
                    : 'text-muted-foreground'
                )}
              >
                {indicators.volumeTrend}
              </div>
            </div>
          </div>

          {/* MACD Signal */}
          {indicators.macdSignal && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">MACD Signal</span>
              <Badge
                variant={
                  indicators.macdSignal === 'BULLISH'
                    ? 'success'
                    : indicators.macdSignal === 'BEARISH'
                    ? 'danger'
                    : 'secondary'
                }
              >
                {indicators.macdSignal}
              </Badge>
            </div>
          )}

          {/* Price Action */}
          <div className="text-sm">
            <span className="text-muted-foreground">Price Action: </span>
            <span>{indicators.priceAction}</span>
          </div>

          {/* Support/Resistance Levels */}
          {(indicators.supportLevel || indicators.resistanceLevel) && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              {indicators.supportLevel && (
                <div className="text-sm">
                  <span className="text-muted-foreground block text-xs">Support</span>
                  <span className="font-mono text-bullish">
                    {formatPrice(indicators.supportLevel)}
                  </span>
                </div>
              )}
              {indicators.resistanceLevel && (
                <div className="text-sm">
                  <span className="text-muted-foreground block text-xs">Resistance</span>
                  <span className="font-mono text-bearish">
                    {formatPrice(indicators.resistanceLevel)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {onTrade && decision !== 'HOLD' && decision !== 'NO_BUY' && (
          <>
            <Separator />
            <div className="flex gap-2">
              <button
                onClick={() => onTrade('BUY')}
                className={cn(
                  'flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors',
                  'bg-bullish/10 text-bullish hover:bg-bullish/20'
                )}
              >
                Execute Buy
              </button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Decision Badge Component
function DecisionBadge({ decision }: { decision: Decision }) {
  const config: Record<Decision, { icon: React.ReactNode; variant: 'success' | 'danger' | 'warning' | 'secondary' }> = {
    BUY: { icon: <TrendingUp className="h-3 w-3" />, variant: 'success' },
    SELL: { icon: <TrendingDown className="h-3 w-3" />, variant: 'danger' },
    NO_BUY: { icon: <XCircle className="h-3 w-3" />, variant: 'danger' },
    HOLD: { icon: <Minus className="h-3 w-3" />, variant: 'warning' },
  };

  const { icon, variant } = config[decision];

  return (
    <Badge variant={variant} className="gap-1 px-3 py-1">
      {icon}
      {decision}
    </Badge>
  );
}

// Risk Badge Component
function RiskBadge({ risk }: { risk: RiskLevel }) {
  const config: Record<RiskLevel, { icon: React.ReactNode; variant: 'success' | 'danger' | 'warning' }> = {
    LOW: { icon: <CheckCircle className="h-3 w-3" />, variant: 'success' },
    MEDIUM: { icon: <AlertTriangle className="h-3 w-3" />, variant: 'warning' },
    HIGH: { icon: <AlertTriangle className="h-3 w-3" />, variant: 'danger' },
  };

  const { icon, variant } = config[risk];

  return (
    <Badge variant={variant} className="gap-1">
      {icon}
      {risk} Risk
    </Badge>
  );
}

// Loading Skeleton
function AnalysisSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-solana animate-pulse" />
            <div className="h-5 w-32 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-6 w-16 bg-muted animate-pulse rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="h-4 w-full bg-muted animate-pulse rounded" />
          <div className="h-2 w-full bg-muted animate-pulse rounded" />
        </div>
        <div className="h-20 w-full bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-16 bg-muted animate-pulse rounded" />
          <div className="h-16 bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

export default AIAnalysisCard;
