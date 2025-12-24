'use client';

import React from 'react';
import { Wallet, LogOut, Copy, ExternalLink, Check, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePhantomWallet } from '@/hooks/useWallet';
import { useState, useCallback } from 'react';

interface WalletButtonProps {
  className?: string;
}

/**
 * Wallet connection button component
 * Integrates with Phantom wallet for Solana transactions
 */
export function WalletButton({ className }: WalletButtonProps) {
  const {
    isAvailable,
    isConnected,
    publicKey,
    balance,
    isLoading,
    error,
    connect,
    disconnect,
    refreshBalance,
    requestAirdrop,
  } = usePhantomWallet();

  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isAirdropping, setIsAirdropping] = useState(false);

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const copyAddress = useCallback(async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [publicKey]);

  const openExplorer = useCallback(() => {
    if (publicKey) {
      window.open(`https://explorer.solana.com/address/${publicKey}?cluster=devnet`, '_blank');
    }
  }, [publicKey]);

  const handleAirdrop = async () => {
    try {
      setIsAirdropping(true);
      await requestAirdrop();
    } catch (err) {
      console.error('Airdrop failed:', err);
    } finally {
      setIsAirdropping(false);
    }
  };

  // Not connected state
  if (!isConnected) {
    return (
      <Button
        variant="outline"
        className={className}
        onClick={connect}
        disabled={isLoading || !isAvailable}
        data-testid="wallet-connect"
      >
        <Wallet className="h-4 w-4 mr-2" />
        {isLoading ? (
          'Connecting...'
        ) : !isAvailable ? (
          'Install Phantom'
        ) : (
          'Connect Wallet'
        )}
      </Button>
    );
  }

  // Connected state
  return (
    <div className="relative">
      <Button
        variant="outline"
        className={className}
        onClick={() => setShowDropdown(!showDropdown)}
        data-testid="wallet-connected"
      >
        <Wallet className="h-4 w-4 mr-2" />
        <span className="font-mono">{shortenAddress(publicKey!)}</span>
        {balance.sol !== null && (
          <span className="ml-2 text-xs text-muted-foreground">
            {balance.sol.toFixed(4)} SOL
          </span>
        )}
      </Button>

      {showDropdown && (
        <div
          className="absolute right-0 mt-2 w-64 bg-card border rounded-lg shadow-lg z-50 p-4"
          data-testid="wallet-dropdown"
        >
          <div className="space-y-4">
            {/* Address Section */}
            <div>
              <label className="text-xs text-muted-foreground">Connected Address</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded flex-1 truncate">
                  {publicKey}
                </code>
                <button
                  onClick={copyAddress}
                  className="p-1 hover:bg-muted rounded"
                  title="Copy address"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={openExplorer}
                  className="p-1 hover:bg-muted rounded"
                  title="View on Explorer"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Balance Section */}
            <div>
              <label className="text-xs text-muted-foreground">Balance</label>
              <div className="flex items-center justify-between mt-1">
                <span className="text-lg font-bold">
                  {balance.sol !== null ? balance.sol.toFixed(4) : '...'} SOL
                </span>
                <Button variant="ghost" size="sm" onClick={refreshBalance}>
                  Refresh
                </Button>
              </div>
            </div>

            {/* Token Balances */}
            {balance.tokens.size > 0 && (
              <div>
                <label className="text-xs text-muted-foreground">Token Balances</label>
                <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
                  {Array.from(balance.tokens.entries()).map(([mint, amount]) => (
                    <div key={mint} className="flex justify-between text-sm">
                      <span className="font-mono text-xs truncate w-24">
                        {mint.slice(0, 8)}...
                      </span>
                      <span>{amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Airdrop Button */}
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleAirdrop}
              disabled={isAirdropping}
            >
              <Coins className="h-4 w-4 mr-2" />
              {isAirdropping ? 'Requesting...' : 'Request Airdrop (Devnet)'}
            </Button>

            {/* Error Display */}
            {error && (
              <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                {error.message}
              </div>
            )}

            {/* Disconnect Button */}
            <Button
              variant="destructive"
              className="w-full"
              onClick={async () => {
                await disconnect();
                setShowDropdown(false);
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}

export default WalletButton;