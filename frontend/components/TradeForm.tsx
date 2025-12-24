'use client';

import React, { useState } from 'react';
import { ArrowRightLeft, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { Token, TradeRequest, TradeResponse, TradeType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  cn,
  formatPrice,
  formatCurrency,
  isValidAmount,
} from '@/lib/utils';

interface TradeFormProps {
  token: Token | null;
  cashBalance?: number;
  tokenBalance?: number;
  onTrade: (request: TradeRequest) => Promise<TradeResponse>;
  disabled?: boolean;
  initialTradeType?: TradeType;
}

export function TradeForm({
  token,
  cashBalance = 10000,
  tokenBalance = 0,
  onTrade,
  disabled = false,
  initialTradeType = 'BUY',
}: TradeFormProps) {
  const [tradeType, setTradeType] = useState<TradeType>(initialTradeType);
  const [amount, setAmount] = useState<string>('');
  const [slippage, setSlippage] = useState<number>(50); // 0.5%
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TradeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const price = token?.price || 0;
  const amountNum = parseFloat(amount) || 0;

  // Calculate estimated output
  const estimatedOutput =
    tradeType === 'BUY'
      ? amountNum / price
      : amountNum * price;

  // Calculate slippage impact
  const slippageImpact = (slippage / 10000) * estimatedOutput;
  const minOutput = estimatedOutput - slippageImpact;

  // Validation
  const maxAmount =
    tradeType === 'BUY' ? cashBalance : tokenBalance * price;
  const isValidTrade =
    isValidAmount(amount) &&
    amountNum > 0 &&
    amountNum <= maxAmount &&
    token !== null;

  const handlePercentageClick = (percentage: number) => {
    const max = tradeType === 'BUY' ? cashBalance : tokenBalance * price;
    setAmount((max * percentage).toFixed(2));
  };

  const handleTrade = async () => {
    if (!token || !isValidTrade) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const request: TradeRequest = {
        symbol: token.symbol,
        type: tradeType,
        amount: amountNum,
        slippageBps: slippage,
      };

      const response = await onTrade(request);

      if (response.status === 'FAILED') {
        setError(response.error || 'Trade failed');
      } else {
        setResult(response);
        setAmount('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trade failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a token to trade</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Trade {token.symbol}
          </CardTitle>
          <Badge variant="outline" className="font-mono">
            {formatPrice(price)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Buy/Sell Toggle */}
        <Tabs
          value={tradeType}
          onValueChange={(v) => {
            setTradeType(v as TradeType);
            setAmount('');
            setResult(null);
            setError(null);
          }}
        >
          <TabsList className="w-full">
            <TabsTrigger
              value="BUY"
              className="flex-1 data-[state=active]:bg-bullish data-[state=active]:text-white"
            >
              Buy
            </TabsTrigger>
            <TabsTrigger
              value="SELL"
              className="flex-1 data-[state=active]:bg-bearish data-[state=active]:text-white"
            >
              Sell
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Balance Display */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {tradeType === 'BUY' ? 'Available Cash' : `${token.symbol} Balance`}
          </span>
          <span className="font-medium">
            {tradeType === 'BUY'
              ? formatCurrency(cashBalance)
              : `${tokenBalance.toLocaleString()} ${token.symbol}`}
          </span>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount">
            Amount ({tradeType === 'BUY' ? 'USD' : token.symbol})
          </Label>
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setResult(null);
              setError(null);
            }}
            className="font-mono"
            disabled={disabled || isLoading}
          />

          {/* Quick Percentage Buttons */}
          <div className="flex gap-2">
            {[0.25, 0.5, 0.75, 1].map((pct) => (
              <Button
                key={pct}
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => handlePercentageClick(pct)}
                disabled={disabled || isLoading}
              >
                {pct * 100}%
              </Button>
            ))}
          </div>
        </div>

        {/* Slippage Setting */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Slippage Tolerance</Label>
            <span className="text-sm text-muted-foreground">
              {(slippage / 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex gap-2">
            {[50, 100, 200, 500].map((bps) => (
              <Button
                key={bps}
                variant={slippage === bps ? 'default' : 'outline'}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setSlippage(bps)}
                disabled={disabled || isLoading}
              >
                {(bps / 100).toFixed(1)}%
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Trade Summary */}
        {amountNum > 0 && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {tradeType === 'BUY' ? 'You Pay' : 'You Sell'}
              </span>
              <span className="font-medium">
                {tradeType === 'BUY'
                  ? formatCurrency(amountNum)
                  : `${amountNum.toLocaleString()} ${token.symbol}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {tradeType === 'BUY' ? 'You Receive (est.)' : 'You Receive (est.)'}
              </span>
              <span className="font-medium font-mono">
                {tradeType === 'BUY'
                  ? `~${estimatedOutput.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${token.symbol}`
                  : formatCurrency(estimatedOutput)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Min. Received</span>
              <span className="text-muted-foreground">
                {tradeType === 'BUY'
                  ? `${minOutput.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${token.symbol}`
                  : formatCurrency(minOutput)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Fee (0.3%)</span>
              <span className="text-muted-foreground">
                {formatCurrency(amountNum * 0.003)}
              </span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-bearish/10 text-bearish rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Display */}
        {result && result.status === 'EXECUTED' && (
          <div className="flex items-center gap-2 p-3 bg-bullish/10 text-bullish rounded-lg text-sm">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            <div>
              <span className="font-medium">Trade Executed!</span>
              <span className="block text-xs opacity-80">
                {result.type === 'BUY' ? 'Bought' : 'Sold'}{' '}
                {result.amountOut.toLocaleString(undefined, { maximumFractionDigits: 4 })}{' '}
                @ {formatPrice(result.price)}
              </span>
            </div>
          </div>
        )}

        {/* Trade Button */}
        <Button
          className={cn(
            'w-full',
            tradeType === 'BUY'
              ? 'bg-bullish hover:bg-bullish-dark'
              : 'bg-bearish hover:bg-bearish-dark'
          )}
          size="lg"
          onClick={handleTrade}
          disabled={disabled || isLoading || !isValidTrade}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              {tradeType === 'BUY' ? 'Buy' : 'Sell'} {token.symbol}
            </>
          )}
        </Button>

        {/* Validation Warning */}
        {amountNum > maxAmount && (
          <p className="text-xs text-bearish text-center">
            Insufficient {tradeType === 'BUY' ? 'balance' : 'tokens'}
          </p>
        )}

        {/* Paper Trading Notice */}
        <p className="text-xs text-center text-muted-foreground">
          📝 Paper Trading Mode - No real funds used
        </p>
      </CardContent>
    </Card>
  );
}

export default TradeForm;
