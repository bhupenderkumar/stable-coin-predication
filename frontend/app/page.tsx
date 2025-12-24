'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Bot, 
  RefreshCw, 
  TrendingUp, 
  Wallet, 
  Activity, 
  AlertTriangle, 
  WifiOff,
  Sparkles,
  BarChart3,
  Clock,
  Zap,
} from 'lucide-react';
import { Token, AnalysisResponse } from '@/types';
import { api, analyzeToken } from '@/lib/api';
import { AIDecisionQueue } from '@/components/AIDecisionQueue';
import { AISettingsModal } from '@/components/AISettingsModal';
import { PortfolioSummary } from '@/components/PortfolioSummary';
import { MarketStats } from '@/components/StatCards';
import { TradeHistory } from '@/components/TradeHistory';
import { PriceChart } from '@/components/PriceChart';
import { TokenTable } from '@/components/TokenTable';
import { AIAnalysisCard } from '@/components/AIAnalysisCard';
import { TradeForm } from '@/components/TradeForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePortfolioStore } from '@/stores/portfolio-store';
import { useAIRecommendationsStore } from '@/stores/ai-recommendations-store';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'decisions' | 'market' | 'portfolio'>('decisions');
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');

  // Portfolio store
  const { portfolio, trades, isLoading, error: portfolioError, executeTrade, executeTradeRequest, refreshPortfolio } = usePortfolioStore();

  const handleManualTrade = (tokenSymbol: string, type: 'buy' | 'sell') => {
    // Find token in portfolio or create a temporary token object if needed
    // For now, we'll try to find it in the portfolio holdings
    const holding = portfolio.holdings.find(h => h.symbol === tokenSymbol);
    
    if (holding) {
      const token: Token = {
        symbol: holding.symbol,
        name: holding.symbol, // We might not have the full name here
        mintAddress: holding.symbol, // Placeholder, we might need this for actual trading if it's not the symbol
        price: holding.current_price,
        volume24h: 0, // Placeholder
        liquidity: 0, // Placeholder
        marketCap: 0, // Placeholder
        priceChange24h: 0, // Placeholder
        priceChange7d: 0, // Placeholder
        holders: 0, // Placeholder
      };
      setSelectedToken(token);
      setTradeType(type.toUpperCase() as 'BUY' | 'SELL');
      setTradeModalOpen(true);
    } else {
      // If not in holdings, we might need to fetch it or look it up
      // For this implementation, we'll assume it's for existing holdings
      console.warn(`Token ${tokenSymbol} not found in holdings`);
    }
  };

  // AI Recommendations store
  const {
    recommendations,
    settings,
    isScanning,
    lastScanTime,
    scanProgress,
    startScan,
    stopScan,
    approveRecommendation,
    rejectRecommendation,
    approveAllPending,
    rejectAllPending,
    updateSettings,
    clearExpired,
  } = useAIRecommendationsStore();

  // Fetch tokens from real API
  const {
    data: tokens = [],
    isLoading: tokensLoading,
    error: tokensError,
    refetch: refetchTokens,
  } = useQuery({
    queryKey: ['tokens'],
    queryFn: () => api.getTokens(),
    refetchInterval: 30000,
    retry: 2,
  });

  // Fetch OHLCV for selected token
  const { data: ohlcv = [], isLoading: ohlcvLoading, error: ohlcvError } = useQuery({
    queryKey: ['ohlcv', selectedToken?.symbol],
    queryFn: () =>
      selectedToken ? api.getTokenOHLCV(selectedToken.symbol) : Promise.resolve([]),
    enabled: !!selectedToken,
    retry: 1,
  });

  // Calculate market stats
  const marketStats = React.useMemo(() => {
    if (!tokens.length) return null;
    return {
      totalVolume24h: tokens.reduce((sum, t) => sum + (t.volume24h || 0), 0),
      totalMarketCap: tokens.reduce((sum, t) => sum + (t.marketCap || 0), 0),
      totalLiquidity: tokens.reduce((sum, t) => sum + (t.liquidity || 0), 0),
      activeTokens: tokens.length,
      volumeChange: 0,
      marketCapChange: 0,
    };
  }, [tokens]);

  // Initialize portfolio
  useEffect(() => {
    const initializePortfolio = async () => {
      const store = usePortfolioStore.getState();
      if (!store.isInitialized) {
        await store.initialize();
      }
    };
    initializePortfolio();
  }, []);

  // Clear expired recommendations periodically
  useEffect(() => {
    const interval = setInterval(clearExpired, 60000);
    return () => clearInterval(interval);
  }, [clearExpired]);

  // Pending recommendations count
  const pendingCount = recommendations.filter(r => r.status === 'PENDING').length;

  // Handle AI scan
  const handleStartScan = () => {
    if (tokens.length > 0) {
      startScan(tokens);
    }
  };

  // Handle approve with trade execution
  const handleApprove = async (id: string) => {
    await approveRecommendation(id, executeTrade);
  };

  // Handle approve all with trade execution
  const handleApproveAll = async () => {
    await approveAllPending(executeTrade);
  };

  // Handle token analysis (for market view)
  const handleAnalyze = async (symbol: string) => {
    setIsAnalyzing(true);
    setAnalysis(null);
    const token = tokens.find((t) => t.symbol === symbol);
    if (token) setSelectedToken(token);
    try {
      const result = await analyzeToken(symbol);
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 p-8 text-white">
        <div className="absolute inset-0 bg-grid-white/5" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-solana/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center transition-all',
              isScanning 
                ? 'bg-gradient-to-br from-solana to-purple-500 animate-pulse' 
                : 'bg-gradient-to-br from-solana/80 to-purple-600/80'
            )}>
              <Bot className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                AI Trading Assistant
                {pendingCount > 0 && (
                  <Badge className="bg-red-500 text-white animate-pulse">
                    {pendingCount} Pending
                  </Badge>
                )}
              </h1>
              <p className="text-white/70 mt-1">
                {isScanning ? (
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    Scanning {tokens.length} tokens for opportunities...
                  </span>
                ) : pendingCount > 0 ? (
                  'Review AI recommendations and approve or reject trades'
                ) : (
                  'Your AI-powered trading copilot. Sit back and approve trades.'
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Scanning Progress */}
            {isScanning && (
              <div className="w-48">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-white/70">Scanning...</span>
                  <span className="font-semibold">{Math.round(scanProgress)}%</span>
                </div>
                <Progress value={scanProgress} className="h-2 bg-white/20" indicatorClassName="bg-solana" />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => refetchTokens()}
                disabled={tokensLoading}
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', tokensLoading && 'animate-spin')} />
                Refresh
              </Button>
              <Button
                onClick={isScanning ? stopScan : handleStartScan}
                disabled={tokensLoading || tokens.length === 0}
                className={cn(
                  isScanning 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-gradient-to-r from-solana to-purple-500 hover:from-solana/90 hover:to-purple-500/90'
                )}
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Stop Scan
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
        </div>

        {/* Quick Stats Bar */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
              <TrendingUp className="h-4 w-4" />
              Portfolio Value
            </div>
            <p className="text-2xl font-bold">
              ${portfolio?.totalValue.toLocaleString() || '0'}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
              <Activity className="h-4 w-4" />
              Today&apos;s P&amp;L
            </div>
            <p className={cn(
              'text-2xl font-bold',
              (portfolio?.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
            )}>
              {(portfolio?.pnl || 0) >= 0 ? '+' : ''}{portfolio?.pnl?.toFixed(2) || '0'}%
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
              <Wallet className="h-4 w-4" />
              Cash Balance
            </div>
            <p className="text-2xl font-bold">
              ${portfolio?.cashBalance.toLocaleString() || '0'}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
              <Clock className="h-4 w-4" />
              Last Scan
            </div>
            <p className="text-2xl font-bold">
              {lastScanTime ? new Date(lastScanTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
            </p>
          </div>
        </div>
      </div>

      {/* Error Alerts */}
      {tokensError && (
        <Alert variant="destructive">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>Unable to Load Market Data</AlertTitle>
          <AlertDescription className="flex items-center gap-2">
            {tokensError instanceof Error ? tokensError.message : 'Failed to connect to trading server.'}
            <Button variant="outline" size="sm" onClick={() => refetchTokens()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {portfolioError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Portfolio Data Unavailable</AlertTitle>
          <AlertDescription className="flex items-center gap-2">
            {portfolioError}
            <Button variant="outline" size="sm" onClick={() => refreshPortfolio()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="decisions" className="gap-2">
            <Bot className="h-4 w-4" />
            AI Decisions
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="market" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Market
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="gap-2">
            <Wallet className="h-4 w-4" />
            Portfolio
          </TabsTrigger>
        </TabsList>

        {/* AI Decisions Tab - Main Focus */}
        <TabsContent value="decisions" className="mt-6">
          <AIDecisionQueue
            recommendations={recommendations}
            isScanning={isScanning}
            lastScanTime={lastScanTime}
            onApprove={handleApprove}
            onReject={rejectRecommendation}
            onApproveAll={handleApproveAll}
            onRejectAll={rejectAllPending}
            onStartScan={handleStartScan}
            onStopScan={stopScan}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </TabsContent>

        {/* Market Tab */}
        <TabsContent value="market" className="mt-6">
          <div className="space-y-6">
            {marketStats && !tokensError && <MarketStats {...marketStats} />}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Trending Meme Coins
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TokenTable
                      tokens={tokens}
                      onAnalyze={handleAnalyze}
                      isLoading={tokensLoading}
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                {selectedToken && (
                  <>
                    <PriceChart
                      symbol={selectedToken.symbol}
                      data={ohlcv}
                      isLoading={ohlcvLoading}
                      error={ohlcvError instanceof Error ? ohlcvError.message : undefined}
                    />
                    <AIAnalysisCard
                      symbol={selectedToken.symbol}
                      analysis={analysis}
                      isLoading={isAnalyzing}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PortfolioSummary
              portfolio={portfolio}
              isLoading={isLoading}
              error={portfolioError}
              onTrade={handleManualTrade}
              onSelectHolding={(symbol) => {
                const token = tokens.find((t) => t.symbol === symbol);
                if (token) {
                  setSelectedToken(token);
                  setActiveTab('market');
                }
              }}
            />
            <TradeHistory trades={trades} isLoading={isLoading} />
          </div>
        </TabsContent>
      </Tabs>

      {/* AI Settings Modal */}
      <AISettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onUpdateSettings={updateSettings}
      />

      {/* Trade Modal */}
      <Dialog open={tradeModalOpen} onOpenChange={setTradeModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Trade {selectedToken?.symbol}</DialogTitle>
          </DialogHeader>
          {selectedToken && (
            <TradeForm
              token={selectedToken}
              cashBalance={portfolio?.cashBalance}
              tokenBalance={portfolio?.holdings.find(h => h.symbol === selectedToken.symbol)?.amount || 0}
              initialTradeType={tradeType}
              onTrade={async (request) => {
                try {
                  const result = await executeTradeRequest(request);
                  setTradeModalOpen(false);
                  return result;
                } catch (error) {
                  console.error('Trade failed:', error);
                  throw error;
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
