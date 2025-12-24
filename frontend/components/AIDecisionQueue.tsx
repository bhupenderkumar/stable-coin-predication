'use client';

import React, { useState } from 'react';
import {
  Brain,
  Zap,
  Filter,
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  TrendingUp,
  History,
  Settings2,
  RefreshCw,
  AlertCircle,
  Inbox,
} from 'lucide-react';
import { AIRecommendation, AIRecommendationStatus } from '@/types';
import { AIDecisionCard, AIDecisionCardCompact } from '@/components/AIDecisionCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface AIDecisionQueueProps {
  recommendations: AIRecommendation[];
  isScanning: boolean;
  lastScanTime: number | null;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => void;
  onApproveAll: () => Promise<void>;
  onRejectAll: () => void;
  onStartScan: () => void;
  onStopScan: () => void;
  onOpenSettings: () => void;
}

export function AIDecisionQueue({
  recommendations,
  isScanning,
  lastScanTime,
  onApprove,
  onReject,
  onApproveAll,
  onRejectAll,
  onStartScan,
  onStopScan,
  onOpenSettings,
}: AIDecisionQueueProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell'>('all');

  // Filter recommendations
  const pendingRecommendations = recommendations.filter(r => r.status === 'PENDING');
  const approvedRecommendations = recommendations.filter(r => r.status === 'APPROVED' || r.status === 'EXECUTED');
  const rejectedRecommendations = recommendations.filter(r => r.status === 'REJECTED');

  const filteredPending = pendingRecommendations.filter(r => {
    if (filter === 'all') return true;
    if (filter === 'buy') return r.decision === 'BUY';
    if (filter === 'sell') return r.decision === 'SELL';
    return true;
  });

  // Stats
  const buyCount = pendingRecommendations.filter(r => r.decision === 'BUY').length;
  const sellCount = pendingRecommendations.filter(r => r.decision === 'SELL').length;
  const highConfidenceCount = pendingRecommendations.filter(r => r.confidence >= 70).length;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center transition-all',
            isScanning 
              ? 'bg-gradient-to-br from-solana to-purple-600 animate-pulse' 
              : 'bg-gradient-to-br from-solana/80 to-purple-600/80'
          )}>
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              AI Trading Decisions
              {pendingRecommendations.length > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  {pendingRecommendations.length} Pending
                </Badge>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isScanning ? (
                <span className="flex items-center gap-1 text-solana">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  AI is scanning markets for opportunities...
                </span>
              ) : lastScanTime ? (
                `Last scan: ${new Date(lastScanTime).toLocaleTimeString()}`
              ) : (
                'Click scan to find trading opportunities'
              )}
            </p>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenSettings}
          >
            <Settings2 className="h-4 w-4 mr-1" />
            Settings
          </Button>
          <Button
            variant={isScanning ? 'destructive' : 'default'}
            onClick={isScanning ? onStopScan : onStartScan}
            className={cn(
              !isScanning && 'bg-gradient-to-r from-solana to-purple-600 hover:from-solana/90 hover:to-purple-600/90'
            )}
          >
            {isScanning ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Stop Scanning
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Start AI Scan
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Buy Signals</p>
                <p className="text-2xl font-bold text-emerald-500">{buyCount}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sell Signals</p>
                <p className="text-2xl font-bold text-red-500">{sellCount}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-500/50 rotate-180" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Confidence</p>
                <p className="text-2xl font-bold text-purple-500">{highConfidenceCount}</p>
              </div>
              <Sparkles className="h-8 w-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Executed Today</p>
                <p className="text-2xl font-bold text-blue-500">{approvedRecommendations.length}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Bulk Actions */}
      {pendingRecommendations.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <TabsList>
                <TabsTrigger value="all" className="gap-1">
                  All
                  <Badge variant="secondary" className="ml-1">{pendingRecommendations.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="buy" className="gap-1">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Buy
                  {buyCount > 0 && <Badge className="ml-1 bg-emerald-500">{buyCount}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="sell" className="gap-1">
                  <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
                  Sell
                  {sellCount > 0 && <Badge className="ml-1 bg-red-500">{sellCount}</Badge>}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRejectAll}
              className="text-red-500 border-red-500/30 hover:bg-red-500/10"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject All
            </Button>
            <Button
              size="sm"
              onClick={onApproveAll}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Approve All ({filteredPending.length})
            </Button>
          </div>
        </div>
      )}

      {/* Decision Cards */}
      {filteredPending.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredPending.map((recommendation) => (
            <AIDecisionCard
              key={recommendation.id}
              recommendation={recommendation}
              onApprove={onApprove}
              onReject={onReject}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Inbox className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Pending Decisions</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                {isScanning 
                  ? "AI is analyzing the market. New recommendations will appear here automatically."
                  : "Start an AI scan to get trading recommendations based on real-time market analysis."
                }
              </p>
              {!isScanning && (
                <Button 
                  onClick={onStartScan}
                  className="bg-gradient-to-r from-solana to-purple-600 hover:from-solana/90 hover:to-purple-600/90"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Start AI Scan
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent History */}
      {(approvedRecommendations.length > 0 || rejectedRecommendations.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Decisions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="approved">
              <TabsList className="mb-4">
                <TabsTrigger value="approved" className="gap-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Approved ({approvedRecommendations.length})
                </TabsTrigger>
                <TabsTrigger value="rejected" className="gap-1">
                  <XCircle className="h-4 w-4 text-red-500" />
                  Rejected ({rejectedRecommendations.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="approved">
                <ScrollArea className="h-[200px]">
                  {approvedRecommendations.length > 0 ? (
                    <div className="space-y-2">
                      {approvedRecommendations.slice(0, 10).map((rec) => (
                        <HistoryItem key={rec.id} recommendation={rec} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No approved decisions yet</p>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="rejected">
                <ScrollArea className="h-[200px]">
                  {rejectedRecommendations.length > 0 ? (
                    <div className="space-y-2">
                      {rejectedRecommendations.slice(0, 10).map((rec) => (
                        <HistoryItem key={rec.id} recommendation={rec} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No rejected decisions yet</p>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function HistoryItem({ recommendation }: { recommendation: AIRecommendation }) {
  const { symbol, decision, confidence, status, suggestedAmount, createdAt } = recommendation;
  const time = new Date(createdAt).toLocaleTimeString();

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          decision === 'BUY' ? 'bg-emerald-500/20' : 'bg-red-500/20'
        )}>
          <TrendingUp className={cn(
            'h-4 w-4',
            decision === 'BUY' ? 'text-emerald-500' : 'text-red-500 rotate-180'
          )} />
        </div>
        <div>
          <p className="font-semibold">{symbol}</p>
          <p className="text-xs text-muted-foreground">{time}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant="outline">{confidence}% conf.</Badge>
        <Badge className={cn(
          status === 'APPROVED' || status === 'EXECUTED'
            ? 'bg-emerald-500'
            : 'bg-red-500',
          'text-white'
        )}>
          {status === 'EXECUTED' ? 'Executed' : status}
        </Badge>
      </div>
    </div>
  );
}

export default AIDecisionQueue;
