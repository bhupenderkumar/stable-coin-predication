'use client';

import React from 'react';
import {
  AlertTriangle,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  Info,
} from 'lucide-react';
import { RiskLevel } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface RiskFactor {
  id: string;
  name: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

interface RiskMeterProps {
  level: RiskLevel;
  score?: number; // 0-100
  factors?: RiskFactor[];
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const riskConfig: Record<
  RiskLevel,
  {
    color: string;
    bgColor: string;
    icon: React.ElementType;
    label: string;
    description: string;
    range: [number, number];
  }
> = {
  LOW: {
    color: 'text-bullish',
    bgColor: 'bg-bullish/10',
    icon: ShieldCheck,
    label: 'Low Risk',
    description: 'Relatively safe investment with established fundamentals.',
    range: [0, 33],
  },
  MEDIUM: {
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    icon: Shield,
    label: 'Medium Risk',
    description: 'Moderate volatility expected. Suitable for balanced portfolios.',
    range: [34, 66],
  },
  HIGH: {
    color: 'text-bearish',
    bgColor: 'bg-bearish/10',
    icon: ShieldAlert,
    label: 'High Risk',
    description: 'High volatility and potential for significant losses.',
    range: [67, 100],
  },
};

const severityColors = {
  low: 'text-bullish bg-bullish/10',
  medium: 'text-yellow-500 bg-yellow-500/10',
  high: 'text-bearish bg-bearish/10',
};

/**
 * RiskMeter component - Visual representation of risk level
 */
export function RiskMeter({
  level,
  score,
  factors = [],
  showDetails = false,
  size = 'md',
  className,
}: RiskMeterProps) {
  const config = riskConfig[level];
  const Icon = config.icon;
  
  // Calculate score if not provided
  const displayScore = score ?? (config.range[0] + config.range[1]) / 2;
  
  const sizeClasses = {
    sm: 'h-16',
    md: 'h-24',
    lg: 'h-32',
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Risk Assessment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Risk Display */}
        <div className={cn('flex items-center gap-4', sizeClasses[size])}>
          {/* Risk Icon */}
          <div
            className={cn(
              'rounded-full p-3 flex items-center justify-center',
              config.bgColor
            )}
          >
            <Icon className={cn('h-8 w-8', config.color)} />
          </div>

          {/* Risk Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={cn('font-bold text-lg', config.color)}>
                {config.label}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{config.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Risk Score Bar */}
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Risk Score</span>
                <span>{Math.round(displayScore)}/100</span>
              </div>
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-r from-bullish via-yellow-500 to-bearish opacity-30" />
                {/* Score Indicator */}
                <div
                  className={cn(
                    'absolute h-full rounded-full transition-all duration-500',
                    level === 'LOW'
                      ? 'bg-bullish'
                      : level === 'MEDIUM'
                      ? 'bg-yellow-500'
                      : 'bg-bearish'
                  )}
                  style={{ width: `${displayScore}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Risk Factors */}
        {showDetails && factors.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Risk Factors ({factors.length})
            </h4>
            <div className="space-y-2">
              {factors.map((factor) => (
                <div
                  key={factor.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn('text-xs', severityColors[factor.severity])}
                    >
                      {factor.severity}
                    </Badge>
                    <span>{factor.name}</span>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{factor.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface RiskMeterCompactProps {
  level: RiskLevel;
  showLabel?: boolean;
  className?: string;
}

/**
 * Compact version of RiskMeter for use in tables/lists
 */
export function RiskMeterCompact({
  level,
  showLabel = true,
  className,
}: RiskMeterCompactProps) {
  const config = riskConfig[level];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Icon className={cn('h-4 w-4', config.color)} />
      {showLabel && (
        <span className={cn('text-sm font-medium', config.color)}>
          {level}
        </span>
      )}
    </div>
  );
}

interface RiskGaugeProps {
  score: number; // 0-100
  size?: number;
  className?: string;
}

/**
 * Circular gauge visualization for risk score
 */
export function RiskGauge({ score, size = 100, className }: RiskGaugeProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const rotation = (clampedScore / 100) * 180;
  
  const getColor = (score: number) => {
    if (score <= 33) return '#22c55e'; // bullish/green
    if (score <= 66) return '#eab308'; // yellow
    return '#ef4444'; // bearish/red
  };

  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const offset = circumference - (clampedScore / 100) * circumference;

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size / 2 + 10 }}>
      <svg
        width={size}
        height={size / 2 + 10}
        viewBox={`0 0 ${size} ${size / 2 + 10}`}
        className="transform rotate-0"
      >
        {/* Background Arc */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        {/* Foreground Arc */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke={getColor(clampedScore)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
        {/* Needle */}
        <line
          x1={size / 2}
          y1={size / 2}
          x2={size / 2}
          y2={strokeWidth + 10}
          stroke="currentColor"
          strokeWidth={2}
          className="text-foreground origin-center transition-transform duration-500"
          style={{
            transform: `rotate(${rotation - 90}deg)`,
            transformOrigin: `${size / 2}px ${size / 2}px`,
          }}
        />
        {/* Center Dot */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={4}
          fill="currentColor"
          className="text-foreground"
        />
      </svg>
      {/* Score Label */}
      <div
        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center"
      >
        <span className="text-lg font-bold">{Math.round(clampedScore)}</span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>
    </div>
  );
}

interface RiskIndicatorBarProps {
  level: RiskLevel;
  animated?: boolean;
  className?: string;
}

/**
 * Horizontal bar indicator showing risk level
 */
export function RiskIndicatorBar({
  level,
  animated = true,
  className,
}: RiskIndicatorBarProps) {
  const levels: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH'];
  const activeIndex = levels.indexOf(level);

  return (
    <div className={cn('flex gap-1', className)}>
      {levels.map((l, index) => (
        <div
          key={l}
          className={cn(
            'h-2 flex-1 rounded-full transition-all duration-300',
            index <= activeIndex
              ? l === 'LOW'
                ? 'bg-bullish'
                : l === 'MEDIUM'
                ? 'bg-yellow-500'
                : 'bg-bearish'
              : 'bg-muted',
            animated && index <= activeIndex && 'animate-pulse'
          )}
        />
      ))}
    </div>
  );
}

export default RiskMeter;