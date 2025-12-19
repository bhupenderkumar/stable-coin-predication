'use client';

import { useState, useEffect, useCallback } from 'react';

// Phantom wallet types
interface PhantomProvider {
  isPhantom: boolean;
  publicKey: { toString: () => string } | null;
  isConnected: boolean;
  signTransaction: (transaction: unknown) => Promise<unknown>;
  signAllTransactions: (transactions: unknown[]) => Promise<unknown[]>;
  signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  off: (event: string, callback: (...args: unknown[]) => void) => void;
}

interface WalletState {
  connected: boolean;
  publicKey: string | null;
  balance: number | null;
  isConnecting: boolean;
  error: Error | null;
}

interface UseWalletReturn extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: unknown) => Promise<unknown>;
  signMessage: (message: string) => Promise<string>;
}

/**
 * Hook for managing wallet connection and operations
 */
export function useWallet(): UseWalletReturn {
  const [state, setState] = useState<WalletState>({
    connected: false,
    publicKey: null,
    balance: null,
    isConnecting: false,
    error: null,
  });

  const getProvider = useCallback((): PhantomProvider | null => {
    if (typeof window === 'undefined') return null;
    const phantom = (window as unknown as { solana?: PhantomProvider }).solana;
    if (phantom?.isPhantom) {
      return phantom;
    }
    return null;
  }, []);

  const connect = useCallback(async () => {
    const provider = getProvider();
    
    if (!provider) {
      setState((prev) => ({
        ...prev,
        error: new Error('Phantom wallet not found. Please install Phantom.'),
      }));
      return;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const response = await provider.connect();
      setState({
        connected: true,
        publicKey: response.publicKey.toString(),
        balance: null,
        isConnecting: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: err instanceof Error ? err : new Error('Failed to connect wallet'),
      }));
    }
  }, [getProvider]);

  const disconnect = useCallback(async () => {
    const provider = getProvider();
    
    if (provider) {
      try {
        await provider.disconnect();
      } catch (err) {
        console.error('Disconnect error:', err);
      }
    }

    setState({
      connected: false,
      publicKey: null,
      balance: null,
      isConnecting: false,
      error: null,
    });
  }, [getProvider]);

  const signTransaction = useCallback(
    async (transaction: unknown) => {
      const provider = getProvider();
      if (!provider) {
        throw new Error('Wallet not connected');
      }
      return provider.signTransaction(transaction);
    },
    [getProvider]
  );

  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      const provider = getProvider();
      if (!provider) {
        throw new Error('Wallet not connected');
      }
      
      const encodedMessage = new TextEncoder().encode(message);
      const { signature } = await provider.signMessage(encodedMessage);
      return Buffer.from(signature).toString('base64');
    },
    [getProvider]
  );

  // Check initial connection state
  useEffect(() => {
    const provider = getProvider();
    if (provider?.isConnected && provider.publicKey) {
      setState({
        connected: true,
        publicKey: provider.publicKey.toString(),
        balance: null,
        isConnecting: false,
        error: null,
      });
    }
  }, [getProvider]);

  // Listen for account changes
  useEffect(() => {
    const provider = getProvider();
    if (!provider) return;

    const handleAccountChange = (...args: unknown[]) => {
      const publicKey = args[0] as { toString: () => string } | null;
      if (publicKey) {
        setState((prev) => ({
          ...prev,
          publicKey: publicKey.toString(),
        }));
      } else {
        setState({
          connected: false,
          publicKey: null,
          balance: null,
          isConnecting: false,
          error: null,
        });
      }
    };

    const handleDisconnect = () => {
      setState({
        connected: false,
        publicKey: null,
        balance: null,
        isConnecting: false,
        error: null,
      });
    };

    provider.on('accountChanged', handleAccountChange);
    provider.on('disconnect', handleDisconnect);

    return () => {
      provider.off('accountChanged', handleAccountChange);
      provider.off('disconnect', handleDisconnect);
    };
  }, [getProvider]);

  return {
    ...state,
    connect,
    disconnect,
    signTransaction,
    signMessage,
  };
}

interface WalletBalanceState {
  solBalance: number | null;
  tokenBalances: Map<string, number>;
  isLoading: boolean;
  error: Error | null;
}

interface UseWalletBalanceReturn extends WalletBalanceState {
  refetch: () => Promise<void>;
  getTokenBalance: (mint: string) => number | null;
}

/**
 * Hook for fetching wallet balances from the backend
 */
export function useWalletBalance(publicKey: string | null): UseWalletBalanceReturn {
  const [state, setState] = useState<WalletBalanceState>({
    solBalance: null,
    tokenBalances: new Map(),
    isLoading: false,
    error: null,
  });

  const fetchBalances = useCallback(async () => {
    if (!publicKey) {
      setState({
        solBalance: null,
        tokenBalances: new Map(),
        isLoading: false,
        error: null,
      });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE}/api/blockchain/wallet/balances/${publicKey}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch balances');
      }

      const data = await response.json();
      
      const tokenBalances = new Map<string, number>();
      if (data.tokens) {
        for (const token of data.tokens) {
          tokenBalances.set(token.mint, token.balance);
        }
      }

      setState({
        solBalance: data.solBalance || 0,
        tokenBalances,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err : new Error('Failed to fetch balances'),
      }));
    }
  }, [publicKey]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const getTokenBalance = useCallback(
    (mint: string) => {
      return state.tokenBalances.get(mint) ?? null;
    },
    [state.tokenBalances]
  );

  return {
    ...state,
    refetch: fetchBalances,
    getTokenBalance,
  };
}

interface PhantomWalletState {
  isAvailable: boolean;
  isConnected: boolean;
  publicKey: string | null;
  balance: {
    sol: number | null;
    tokens: Map<string, number>;
  };
  isLoading: boolean;
  error: Error | null;
}

interface UsePhantomWalletReturn extends PhantomWalletState {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signAndSendTransaction: (serializedTransaction: string) => Promise<string>;
  refreshBalance: () => Promise<void>;
}

/**
 * Full Phantom wallet integration hook
 */
export function usePhantomWallet(): UsePhantomWalletReturn {
  const wallet = useWallet();
  const balances = useWalletBalance(wallet.publicKey);

  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const phantom = (window as unknown as { solana?: PhantomProvider }).solana;
      setIsAvailable(!!phantom?.isPhantom);
    }
  }, []);

  const signAndSendTransaction = useCallback(
    async (serializedTransaction: string): Promise<string> => {
      if (!wallet.connected || !wallet.publicKey) {
        throw new Error('Wallet not connected');
      }

      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      // First, sign the transaction with the wallet
      // The serialized transaction should be decoded and signed
      const signedTx = await wallet.signTransaction(
        Buffer.from(serializedTransaction, 'base64')
      );

      // Then send the signed transaction via our backend
      const response = await fetch(`${API_BASE}/api/blockchain/transaction/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction: Buffer.from(signedTx as unknown as ArrayBuffer).toString('base64'),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Transaction failed');
      }

      const result = await response.json();
      return result.signature;
    },
    [wallet]
  );

  return {
    isAvailable,
    isConnected: wallet.connected,
    publicKey: wallet.publicKey,
    balance: {
      sol: balances.solBalance,
      tokens: balances.tokenBalances,
    },
    isLoading: wallet.isConnecting || balances.isLoading,
    error: wallet.error || balances.error,
    connect: wallet.connect,
    disconnect: wallet.disconnect,
    signAndSendTransaction,
    refreshBalance: balances.refetch,
  };
}

export default useWallet;