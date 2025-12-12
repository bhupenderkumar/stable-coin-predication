'use client';

import React, { useState } from 'react';
import { Settings, Save, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useFeatureFlags } from '@/lib/feature-flags';
import { usePortfolioStore } from '@/stores/portfolio-store';

export default function SettingsPage() {
  const featureFlags = useFeatureFlags();
  const { reset } = usePortfolioStore();
  
  const [settings, setSettings] = useState({
    defaultSlippage: '0.5',
    refreshInterval: '30',
    maxTradeAmount: '1000',
    riskTolerance: 'medium',
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // In real app, would save to localStorage or API
    localStorage.setItem('trading-settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset your portfolio? This cannot be undone.')) {
      reset();
    }
  };

  return (
    <div className="container py-6 space-y-6 max-w-2xl">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8 text-solana" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure your trading preferences
        </p>
      </div>

      {/* API Status */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>
            Current API mode and feature flags
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">API Mode</span>
            <Badge
              className={
                !featureFlags.USE_REAL_API
                  ? 'bg-yellow-500/20 text-yellow-500'
                  : 'bg-bullish/20 text-bullish'
              }
            >
              {!featureFlags.USE_REAL_API ? 'Mock Data' : 'Live API'}
            </Badge>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium">Feature Flags</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                <span className="text-sm">Trading</span>
                <Badge variant={featureFlags.ENABLE_TRADING ? 'default' : 'outline'}>
                  {featureFlags.ENABLE_TRADING ? 'On' : 'Off'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                <span className="text-sm">AI Analysis</span>
                <Badge variant={featureFlags.ENABLE_AI_ANALYSIS ? 'default' : 'outline'}>
                  {featureFlags.ENABLE_AI_ANALYSIS ? 'On' : 'Off'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                <span className="text-sm">Portfolio</span>
                <Badge variant={featureFlags.ENABLE_PORTFOLIO ? 'default' : 'outline'}>
                  {featureFlags.ENABLE_PORTFOLIO ? 'On' : 'Off'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                <span className="text-sm">Notifications</span>
                <Badge variant={featureFlags.ENABLE_NOTIFICATIONS ? 'default' : 'outline'}>
                  {featureFlags.ENABLE_NOTIFICATIONS ? 'On' : 'Off'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Feature flags are controlled via environment variables.
            Set <code className="bg-muted px-1 rounded">NEXT_PUBLIC_USE_REAL_API=true</code> to use live APIs.
          </div>
        </CardContent>
      </Card>

      {/* Trading Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Trading Preferences</CardTitle>
          <CardDescription>
            Default values for trading operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slippage">Default Slippage (%)</Label>
            <Input
              id="slippage"
              type="number"
              step="0.1"
              min="0.1"
              max="5"
              value={settings.defaultSlippage}
              onChange={(e) =>
                setSettings({ ...settings, defaultSlippage: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Maximum price difference allowed for trades (0.1% - 5%)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="refresh">Auto-refresh Interval (seconds)</Label>
            <Input
              id="refresh"
              type="number"
              step="5"
              min="10"
              max="300"
              value={settings.refreshInterval}
              onChange={(e) =>
                setSettings({ ...settings, refreshInterval: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              How often to refresh market data (10s - 300s)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxTrade">Max Trade Amount (USD)</Label>
            <Input
              id="maxTrade"
              type="number"
              step="100"
              min="10"
              value={settings.maxTradeAmount}
              onChange={(e) =>
                setSettings({ ...settings, maxTradeAmount: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Maximum amount per trade for risk management
            </p>
          </div>

          <div className="space-y-2">
            <Label>Risk Tolerance</Label>
            <div className="flex gap-2">
              {['low', 'medium', 'high'].map((level) => (
                <Button
                  key={level}
                  variant={settings.riskTolerance === level ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSettings({ ...settings, riskTolerance: level })}
                  className="capitalize"
                >
                  {level}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Affects AI analysis confidence thresholds
            </p>
          </div>

          <Button onClick={handleSave} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {saved ? 'Saved!' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-bearish/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-bearish">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Destructive actions that cannot be undone
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset Portfolio
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            This will reset your portfolio to the initial mock state.
            All trades and holdings will be lost.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
