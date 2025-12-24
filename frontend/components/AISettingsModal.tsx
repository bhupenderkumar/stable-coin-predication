'use client';

import React from 'react';
import {
  Settings2,
  Brain,
  Clock,
  Target,
  Shield,
  DollarSign,
  Zap,
  Info,
} from 'lucide-react';
import { AISettings, RiskLevel } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface AISettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: AISettings;
  onUpdateSettings: (settings: Partial<AISettings>) => void;
}

export function AISettingsModal({
  open,
  onOpenChange,
  settings,
  onUpdateSettings,
}: AISettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-solana" />
            AI Trading Settings
          </DialogTitle>
          <DialogDescription>
            Configure how the AI analyzes and recommends trades
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Auto Scan Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-solana" />
                Auto Scan
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically scan for opportunities
              </p>
            </div>
            <Switch
              checked={settings.autoScan}
              onCheckedChange={(checked) => onUpdateSettings({ autoScan: checked })}
            />
          </div>

          <Separator />

          {/* Scan Interval */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Scan Interval
            </Label>
            <Select
              value={settings.scanInterval.toString()}
              onValueChange={(value) => onUpdateSettings({ scanInterval: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="60">Every 1 minute</SelectItem>
                <SelectItem value="180">Every 3 minutes</SelectItem>
                <SelectItem value="300">Every 5 minutes</SelectItem>
                <SelectItem value="600">Every 10 minutes</SelectItem>
                <SelectItem value="900">Every 15 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Minimum Confidence */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Minimum Confidence
              </Label>
              <Badge variant="outline">{settings.minConfidence}%</Badge>
            </div>
            <Slider
              value={[settings.minConfidence]}
              onValueChange={([value]) => onUpdateSettings({ minConfidence: value })}
              min={30}
              max={90}
              step={5}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>More signals</span>
              <span>Higher quality</span>
            </div>
          </div>

          <Separator />

          {/* Max Risk Level */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Maximum Risk Level
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {(['LOW', 'MEDIUM', 'HIGH'] as RiskLevel[]).map((risk) => (
                <Button
                  key={risk}
                  variant={settings.maxRiskLevel === risk ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onUpdateSettings({ maxRiskLevel: risk })}
                  className={cn(
                    settings.maxRiskLevel === risk &&
                      (risk === 'LOW'
                        ? 'bg-emerald-500 hover:bg-emerald-600'
                        : risk === 'MEDIUM'
                        ? 'bg-yellow-500 hover:bg-yellow-600'
                        : 'bg-red-500 hover:bg-red-600')
                  )}
                >
                  {risk}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              Only show recommendations at or below this risk level
            </p>
          </div>

          <Separator />

          {/* Default Trade Amount */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Default Trade Amount (USD)
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {[50, 100, 250, 500].map((amount) => (
                <Button
                  key={amount}
                  variant={settings.defaultTradeAmount === amount ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onUpdateSettings({ defaultTradeAmount: amount })}
                  className={cn(
                    settings.defaultTradeAmount === amount && 'bg-solana hover:bg-solana/90'
                  )}
                >
                  ${amount}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Custom:</span>
              <Input
                type="number"
                value={settings.defaultTradeAmount}
                onChange={(e) =>
                  onUpdateSettings({ defaultTradeAmount: parseInt(e.target.value) || 100 })
                }
                className="w-24"
                min={10}
                max={10000}
              />
            </div>
          </div>

          <Separator />

          {/* Auto Approve Threshold (Optional) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Auto-Approve Threshold
                </Label>
                <p className="text-xs text-muted-foreground">
                  Auto-execute trades above this confidence (use with caution!)
                </p>
              </div>
            </div>
            <Select
              value={settings.autoApproveThreshold?.toString() || 'disabled'}
              onValueChange={(value) =>
                onUpdateSettings({
                  autoApproveThreshold: value === 'disabled' ? undefined : parseInt(value),
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="disabled">Disabled (Manual only)</SelectItem>
                <SelectItem value="85">85%+ Confidence</SelectItem>
                <SelectItem value="90">90%+ Confidence</SelectItem>
                <SelectItem value="95">95%+ Confidence</SelectItem>
              </SelectContent>
            </Select>
            {settings.autoApproveThreshold && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                <Info className="h-3 w-3" />
                ⚠️ Auto-approve is enabled. Trades will execute automatically!
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AISettingsModal;
