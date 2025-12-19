'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { WSMessage, PriceUpdate, Token } from '@/types';

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  onMessage?: (message: WSMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

interface UseWebSocketReturn {
  status: WebSocketStatus;
  connect: () => void;
  disconnect: () => void;
  send: (message: unknown) => void;
  lastMessage: WSMessage | null;
}

/**
 * Hook for WebSocket connection management
 */
export function useWebSocket(
  url: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const {
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus('connecting');

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setStatus('connected');
        reconnectCountRef.current = 0;
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          setLastMessage(message);
          onMessage?.(message);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        setStatus('disconnected');
        wsRef.current = null;
        onDisconnect?.();

        // Attempt to reconnect
        if (reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        setStatus('error');
        onError?.(error);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('WebSocket connection error:', err);
      setStatus('error');
    }
  }, [url, reconnectAttempts, reconnectInterval, onConnect, onDisconnect, onError, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectCountRef.current = reconnectAttempts; // Prevent reconnection
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setStatus('disconnected');
  }, [reconnectAttempts]);

  const send = useCallback((message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    status,
    connect,
    disconnect,
    send,
    lastMessage,
  };
}

interface UsePriceStreamOptions {
  symbols?: string[];
  onPriceUpdate?: (update: PriceUpdate) => void;
}

interface UsePriceStreamReturn {
  prices: Map<string, PriceUpdate>;
  status: WebSocketStatus;
  subscribe: (symbol: string) => void;
  unsubscribe: (symbol: string) => void;
  getPrice: (symbol: string) => PriceUpdate | null;
}

/**
 * Hook for streaming real-time price updates
 */
export function usePriceStream(options: UsePriceStreamOptions = {}): UsePriceStreamReturn {
  const { symbols = [], onPriceUpdate } = options;

  const [prices, setPrices] = useState<Map<string, PriceUpdate>>(new Map());
  const subscribedSymbols = useRef<Set<string>>(new Set(symbols));

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/prices';

  const handleMessage = useCallback(
    (message: WSMessage) => {
      if (message.type === 'price_update') {
        const update = message.payload as PriceUpdate;
        
        setPrices((prev) => {
          const newPrices = new Map(prev);
          newPrices.set(update.symbol, update);
          return newPrices;
        });

        onPriceUpdate?.(update);
      }
    },
    [onPriceUpdate]
  );

  const { status, send, connect } = useWebSocket(wsUrl, {
    autoConnect: symbols.length > 0,
    onMessage: handleMessage,
    onConnect: () => {
      // Re-subscribe to all symbols on reconnect
      subscribedSymbols.current.forEach((symbol) => {
        send({ type: 'subscribe', symbol });
      });
    },
  });

  const subscribe = useCallback(
    (symbol: string) => {
      subscribedSymbols.current.add(symbol);
      if (status === 'connected') {
        send({ type: 'subscribe', symbol });
      } else {
        connect();
      }
    },
    [status, send, connect]
  );

  const unsubscribe = useCallback(
    (symbol: string) => {
      subscribedSymbols.current.delete(symbol);
      if (status === 'connected') {
        send({ type: 'unsubscribe', symbol });
      }
    },
    [status, send]
  );

  const getPrice = useCallback(
    (symbol: string) => {
      return prices.get(symbol) ?? null;
    },
    [prices]
  );

  // Subscribe to initial symbols
  useEffect(() => {
    if (status === 'connected') {
      symbols.forEach((symbol) => {
        if (!subscribedSymbols.current.has(symbol)) {
          subscribedSymbols.current.add(symbol);
          send({ type: 'subscribe', symbol });
        }
      });
    }
  }, [symbols, status, send]);

  return {
    prices,
    status,
    subscribe,
    unsubscribe,
    getPrice,
  };
}

interface UseTokenUpdatesReturn {
  tokens: Token[];
  isConnected: boolean;
  lastUpdate: number | null;
}

/**
 * Hook for receiving real-time token updates and merging with existing data
 */
export function useTokenUpdates(initialTokens: Token[]): UseTokenUpdatesReturn {
  const [tokens, setTokens] = useState<Token[]>(initialTokens);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  const { status, prices } = usePriceStream({
    symbols: initialTokens.map((t) => t.symbol),
  });

  // Update tokens when prices change
  useEffect(() => {
    if (prices.size === 0) return;

    setTokens((prevTokens) =>
      prevTokens.map((token) => {
        const priceUpdate = prices.get(token.symbol);
        if (priceUpdate) {
          return {
            ...token,
            price: priceUpdate.price,
            priceChange24h: priceUpdate.change24h,
            volume24h: priceUpdate.volume24h,
          };
        }
        return token;
      })
    );

    setLastUpdate(Date.now());
  }, [prices]);

  // Update when initial tokens change
  useEffect(() => {
    setTokens(initialTokens);
  }, [initialTokens]);

  return {
    tokens,
    isConnected: status === 'connected',
    lastUpdate,
  };
}

export default useWebSocket;