'use client';

import React, { useState } from 'react';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Target,
  Shield,
  DollarSign,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { AIRecommendation, Decision, RiskLevel } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  cn,
  formatPrice,
  formatCurrency,
  formatPercentage,
} from '@/lib/utils';

interface AIDecisionCardProps {
  recommendation: AIRecommendation;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => void;
  onViewDetails?: (recommendation: AIRecommendation) => void;
  compact?: boolean;
}

export function AIDecisionCard({
  recommendation,
  onApprove,
  onReject,
  onViewDetails,
  compact = false,
}: AIDecisionCardProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const {
    id,
    symbol,
    tokenName,
    decision,
    confidence,
    reasoning,
    riskLevel,
    suggestedAmount,
    currentPrice,
    potentialProfit,
    potentialLoss,
    status,
    createdAt,
    expiresAt,
  } = recommendation;

  // Calculate time remaining
  const now = Date.now();
  const timeRemaining = Math.max(0, expiresAt - now);
  const timeRemainingMinutes = Math.floor(timeRemaining / 60000);
  const isExpiringSoon = timeRemaining < 300000; // 5 minutes

  // Get styling based on decision
  const getDecisionStyle = () => {
    switch (decision) {
      case 'BUY':
        return {
          border: 'border-l-4 border-l-emerald-500',
          bg: 'bg-gradient-to-r from-emerald-500/10 to-transparent',
          icon: <TrendingUp className="h-6 w-6 text-emerald-500" />,
          badge: 'bg-emerald-500 text-white',
          action: 'Buy',
        };
      case 'SELL':
        return {
          border: 'border-l-4 border-l-red-500',
          bg: 'bg-gradient-to-r from-red-500/10 to-transparent',
          icon: <TrendingDown className="h-6 w-6 text-red-500" />,
          badge: 'bg-red-500 text-white',
          action: 'Sell',
        };
      default:
        return {
          border: 'border-l-4 border-l-yellow-500',
          bg: 'bg-gradient-to-r from-yellow-500/10 to-transparent',
          icon: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
          badge: 'bg-yellow-500 text-white',
          action: 'Hold',
        };
    }
  };

  const getRiskBadge = () => {
    const config: Record<RiskLevel, { color: string; label: string }> = {
      LOW: { color: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30', label: '✓ Low Risk' },
      MEDIUM: { color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30', label: '⚠ Medium Risk' },
      HIGH: { color: 'bg-red-500/20 text-red-600 border-red-500/30', label: '⚠ High Risk' },
    };
    return config[riskLevel];
  };

  const style = getDecisionStyle();
  const riskBadge = getRiskBadge();
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setIsApproving(true);
    setError(null);
    try {
      await onApprove(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = () => {
    setIsRejecting(true);
    onReject(id);
    setIsRejecting(false);
  };

  if (status !== 'PENDING') {
    return null; // Don't show non-pending recommendations
  }

  return (
    <Card className={cn('overflow-hidden transition-all hover:shadow-lg', style.border, style.bg)}>
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between gap-4">
            {/* Token Info */}
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                decision === 'BUY' ? 'bg-emerald-500/20' : 'bg-red-500/20'
              )}>
                {style.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg">{symbol}</h3>
                  <Badge className={cn('font-bold', style.badge)}>
                    {decision === 'BUY' ? '🚀 BUY' : decision === 'SELL' ? '📉 SELL' : '⏸ HOLD'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{tokenName}</p>
              </div>
            </div>

            {/* Time & Status */}
            <div className="text-right">
              <div className={cn(
                'flex items-center gap-1 text-sm',
                isExpiringSoon ? 'text-red-500' : 'text-muted-foreground'
              )}>
                <Clock className="h-4 w-4" />
                {timeRemainingMinutes > 0 ? `${timeRemainingMinutes}m left` : 'Expiring...'}
              </div>
              <Badge variant="outline" className={cn('mt-1 border', riskBadge.color)}>
                {riskBadge.label}
              </Badge>
            </div>
          </div>
        </div>

        {/* Confidence Bar */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <Brain className="h-4 w-4" /> AI Confidence
            </span>
            <span className={cn(
              'font-bold',
              confidence >= 70 ? 'text-emerald-500' : confidence >= 50 ? 'text-yellow-500' : 'text-red-500'
            )}>
              {confidence}%
            </span>
          </div>
          <Progress
            value={confidence}
            className="h-2"
            indicatorClassName={cn(
              confidence >= 70 ? 'bg-emerald-500' : confidence >= 50 ? 'bg-yellow-500' : 'bg-red-500'
            )}
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 px-4 pb-3">
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <p className="text-xs text-muted-foreground">Price</p>
            <p className="font-mono font-semibold">{formatPrice(currentPrice)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="font-semibold text-solana">{formatCurrency(suggestedAmount)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <p className="text-xs text-muted-foreground">Potential</p>
            <p className={cn(
              'font-semibold',
              potentialProfit && potentialProfit > 0 ? 'text-emerald-500' : 'text-muted-foreground'
            )}>
              {potentialProfit ? `+${potentialProfit.toFixed(1)}%` : 'N/A'}
            </p>
          </div>
        </div>

        {/* Reasoning */}
        {!compact && (
          <div className="px-4 pb-3">
            <p className="text-sm text-muted-foreground line-clamp-2">
              <span className="font-medium text-foreground">AI Analysis: </span>
              {reasoning}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="px-4 pb-3 text-sm text-red-500 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 p-4 pt-0">
          <Button
            variant="outline"
            className="flex-1 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-600"
            onClick={handleReject}
            disabled={isApproving || isRejecting}
          >
            {isRejecting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            Reject
          </Button>
          <Button
            className={cn(
              'flex-1 font-semibold',
              decision === 'BUY'
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            )}
            onClick={handleApprove}
            disabled={isApproving || isRejecting}
          >
            {isApproving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Approve {style.action}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for list views
export function AIDecisionCardCompact({
  recommendation,
  onApprove,
  onReject,
}: AIDecisionCardProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { id, symbol, decision, confidence, suggestedAmount, currentPrice, riskLevel } = recommendation;

  const handleApprove = async () => {
    setIsApproving(true);
    setError(null);
    try {
      await onApprove(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className={cn(
      'flex items-center gap-4 p-4 rounded-lg border transition-all hover:shadow-md',
      decision === 'BUY' ? 'border-l-4 border-l-emerald-500 bg-emerald-500/5' : 'border-l-4 border-l-red-500 bg-red-500/5'
    )}>
      {/* Token */}
      <div className="flex items-center gap-3 min-w-[140px]">
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center',
          decision === 'BUY' ? 'bg-emerald-500/20' : 'bg-red-500/20'
        )}>
          {decision === 'BUY' ? (
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-500" />
          )}
        </div>
        <div>
          <p className="font-bold">{symbol}</p>
          <p className="text-xs text-muted-foreground">{formatPrice(currentPrice)}</p>
        </div>
      </div>

      {/* Decision Badge */}
      <Badge className={cn(
        'font-bold',
        decision === 'BUY' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
      )}>
        {decision}
      </Badge>

      {/* Confidence */}
      <div className="flex-1 max-w-[100px]">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Conf.</span>
          <span className="font-semibold">{confidence}%</span>
        </div>
        <Progress
          value={confidence}
          className="h-1.5"
          indicatorClassName={cn(
            confidence >= 70 ? 'bg-emerald-500' : 'bg-yellow-500'
          )}
        />
      </div>

      {/* Amount */}
      <div className="text-right min-w-[80px]">
        <p className="font-semibold">{formatCurrency(suggestedAmount)}</p>
        <Badge variant="outline" className={cn(
          'text-xs',
          riskLevel === 'LOW' ? 'border-emerald-500/30 text-emerald-600' :
          riskLevel === 'MEDIUM' ? 'border-yellow-500/30 text-yellow-600' :
          'border-red-500/30 text-red-600'
        )}>
          {riskLevel}
        </Badge>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-end gap-1">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-red-500 hover:bg-red-500/10"
            onClick={() => onReject(id)}
          >
            <XCircle className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            className={cn(
              decision === 'BUY' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600',
              'text-white'
            )}
            onClick={handleApprove}
            disabled={isApproving}
          >
            {isApproving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
          </Button>
        </div>
        {error && <span className="text-xs text-red-500 max-w-[150px] truncate" title={error}>{error}</span>}
      </div>
    </div>
  );
}

export default AIDecisionCard;
