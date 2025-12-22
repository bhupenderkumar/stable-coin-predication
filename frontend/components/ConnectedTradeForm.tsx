'use client';

import React, { useState, useCallback } from 'react';
import { ArrowRightLeft, AlertCircle, Loader2, CheckCircle, Wallet, ExternalLink } from 'lucide-react';
import { Token, TradeType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { usePhantomWallet } from '@/hooks/useWallet';
import {
  cn,
  formatPrice,
  formatCurrency,
  isValidAmount,
} from '@/lib/utils';

interface ConnectedTradeFormProps {
  token: Token | null;
  disabled?: boolean;
}

interface SwapQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: number;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
}

interface TradeResult {
  success: boolean;
  signature?: string;
  error?: string;
  amountOut?: number;
}

// Well-known token addresses
const TOKEN_ADDRESSES: Record<string, string> = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  POPCAT: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Connected Trade Form - Integrates with Phantom wallet and Jupiter for real trading
 */
export function ConnectedTradeForm({ token, disabled = false }: ConnectedTradeFormProps) {
  const {
    isConnected,
    publicKey,
    balance,
    connect,
    signAndSendTransaction,
  } = usePhantomWallet();

  const [tradeType, setTradeType] = useState<TradeType>('BUY');
  const [amount, setAmount] = useState<string>('');
  const [slippage, setSlippage] = useState<number>(50); // 0.5%
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingQuote, setIsGettingQuote] = useState(false);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [result, setResult] = useState<TradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const price = token?.price || 0;
  const amountNum = parseFloat(amount) || 0;

  // Get token mint addresses
  const getTokenMint = useCallback((symbol: string) => {
    return TOKEN_ADDRESSES[symbol.toUpperCase()] || symbol;
  }, []);

  // Calculate balances
  const solBalance = balance.sol ?? 0;
  const tokenBalance = 0; // Would need to fetch actual token balance

  // For BUY: pay SOL/USDC, receive token
  // For SELL: pay token, receive SOL/USDC
  const inputMint = tradeType === 'BUY' ? TOKEN_ADDRESSES.USDC : getTokenMint(token?.symbol || '');
  const outputMint = tradeType === 'BUY' ? getTokenMint(token?.symbol || '') : TOKEN_ADDRESSES.USDC;

  const cashBalance = solBalance * price; // Approximate USDC value
  const maxAmount = tradeType === 'BUY' ? cashBalance : tokenBalance * price;

  // Validation for getting a quote - just needs valid amount and token
  const canGetQuote = 
    isValidAmount(amount) &&
    amountNum > 0 &&
    token !== null;

  // Validation for executing a trade - needs wallet connected and sufficient balance
  const isValidTrade =
    canGetQuote &&
    amountNum <= maxAmount &&
    isConnected;

  // Get swap quote from Jupiter
  const getQuote = useCallback(async () => {
    if (!token || amountNum <= 0) return;

    setIsGettingQuote(true);
    setError(null);
    setQuote(null); // Reset previous quote

    try {
      // Convert amount to lamports/smallest unit
      const decimals = tradeType === 'BUY' ? 6 : 9; // USDC has 6, most tokens have 9
      const amountInSmallestUnit = Math.floor(amountNum * Math.pow(10, decimals));

      const response = await fetch(`${API_BASE}/api/blockchain/swap/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputMint,
          outputMint,
          amount: amountInSmallestUnit,
          slippageBps: slippage,
          onlyDirectRoutes: false,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get swap quote');
      }

      const quoteData = await response.json();
      setQuote(quoteData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get quote');
    } finally {
      setIsGettingQuote(false);
    }
  }, [token, amountNum, tradeType, inputMint, outputMint, slippage]);

  // Execute the swap
  const executeSwap = useCallback(async () => {
    if (!quote || !publicKey || !token) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Step 1: Get swap transaction from Jupiter
      const txResponse = await fetch(`${API_BASE}/api/blockchain/swap/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote,
          userPublicKey: publicKey,
          wrapAndUnwrapSol: true,
          prioritizationFeeLamports: 'auto',
        }),
      });

      if (!txResponse.ok) {
        throw new Error('Failed to create swap transaction');
      }

      const { swapTransaction } = await txResponse.json();

      // Step 2: Sign and send transaction
      const signature = await signAndSendTransaction(swapTransaction);

      // Step 3: Wait for confirmation
      const confirmResponse = await fetch(
        `${API_BASE}/api/blockchain/transaction/wait/${signature}?maxAttempts=30&delayMs=1000`
      );

      const confirmResult = await confirmResponse.json();

      if (confirmResult.status === 'finalized' || confirmResult.status === 'confirmed') {
        setResult({
          success: true,
          signature,
          amountOut: parseFloat(quote.outAmount) / Math.pow(10, 9),
        });
        setAmount('');
        setQuote(null);
      } else {
        throw new Error(`Transaction failed: ${confirmResult.error || 'Unknown error'}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Swap failed');
      setResult({ success: false, error: err instanceof Error ? err.message : 'Swap failed' });
    } finally {
      setIsLoading(false);
    }
  }, [quote, publicKey, token, signAndSendTransaction]);

  const handlePercentageClick = (percentage: number) => {
    const max = tradeType === 'BUY' ? cashBalance : tokenBalance * price;
    setAmount((max * percentage).toFixed(2));
    setQuote(null);
  };

  // Show wallet connection prompt if not connected
  if (!isConnected) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Connect Wallet to Trade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Connect your Phantom wallet to start trading on Solana
            </p>
            <Button onClick={connect} size="lg">
              <Wallet className="h-4 w-4 mr-2" />
              Connect Phantom Wallet
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

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
          onValueChange={(v: string) => {
            setTradeType(v as TradeType);
            setAmount('');
            setQuote(null);
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

        {/* Wallet Info */}
        <div className="flex justify-between text-sm bg-muted/50 p-3 rounded-lg">
          <span className="text-muted-foreground">Connected Wallet</span>
          <span className="font-mono text-xs">
            {publicKey?.slice(0, 4)}...{publicKey?.slice(-4)}
          </span>
        </div>

        {/* Balance Display */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {tradeType === 'BUY' ? 'SOL Balance' : `${token.symbol} Balance`}
          </span>
          <span className="font-medium">
            {tradeType === 'BUY'
              ? `${solBalance.toFixed(4)} SOL`
              : `${tokenBalance.toLocaleString()} ${token.symbol}`}
          </span>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label htmlFor="amount">
            Amount ({tradeType === 'BUY' ? 'USD value' : token.symbol})
          </Label>
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setQuote(null);
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
          <div className="flex gap-2" data-testid="slippage-settings">
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

        {/* Get Quote Button */}
        {!quote && amountNum > 0 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={getQuote}
            disabled={isGettingQuote || !canGetQuote}
          >
            {isGettingQuote ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Getting Quote...
              </>
            ) : (
              'Get Quote'
            )}
          </Button>
        )}

        {/* Quote Display */}
        {quote && (
          <div className="space-y-2 text-sm bg-muted/50 p-3 rounded-lg" data-testid="trade-confirmation">
            <div className="flex justify-between">
              <span className="text-muted-foreground">You Pay</span>
              <span className="font-medium">
                {(parseFloat(quote.inAmount) / Math.pow(10, 6)).toLocaleString()} USDC
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">You Receive (est.)</span>
              <span className="font-medium font-mono">
                ~{(parseFloat(quote.outAmount) / Math.pow(10, 9)).toLocaleString(undefined, { maximumFractionDigits: 4 })} {token.symbol}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Price Impact</span>
              <span className={cn(
                quote.priceImpactPct > 1 ? 'text-bearish' : 'text-muted-foreground'
              )}>
                {quote.priceImpactPct.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Route</span>
              <span className="text-muted-foreground">
                {quote.routePlan?.map((r) => r.swapInfo.label).join(' → ') || 'Direct'}
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
        {result?.success && (
          <div className="flex flex-col gap-2 p-3 bg-bullish/10 text-bullish rounded-lg text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">Swap Executed!</span>
            </div>
            {result.signature && (
              <a
                href={`https://explorer.solana.com/tx/${result.signature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs hover:underline"
              >
                View on Explorer <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}

        {/* Execute Trade Button */}
        {quote && (
          <Button
            className={cn(
              'w-full',
              tradeType === 'BUY'
                ? 'bg-bullish hover:bg-bullish-dark'
                : 'bg-bearish hover:bg-bearish-dark'
            )}
            size="lg"
            onClick={executeSwap}
            disabled={disabled || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Executing Swap...
              </>
            ) : (
              <>
                Confirm {tradeType === 'BUY' ? 'Buy' : 'Sell'} {token.symbol}
              </>
            )}
          </Button>
        )}

        {/* Standard Trade Button (when no quote) */}
        {!quote && (
          <Button
            className={cn(
              'w-full',
              tradeType === 'BUY'
                ? 'bg-bullish hover:bg-bullish-dark'
                : 'bg-bearish hover:bg-bearish-dark'
            )}
            size="lg"
            disabled={true}
          >
            {tradeType === 'BUY' ? 'Buy' : 'Sell'} {token.symbol}
          </Button>
        )}

        {/* Network Notice */}
        <p className="text-xs text-center text-muted-foreground">
          ⚡ Trading on Solana via Jupiter Aggregator
        </p>
      </CardContent>
    </Card>
  );
}

export default ConnectedTradeForm;