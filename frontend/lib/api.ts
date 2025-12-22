// ============================================
// API Client
// ============================================

import type {
  Token,
  AnalysisResponse,
  OHLCV,
  TradeResponse,
  TradeRequest,
  Portfolio,
  Trade,
  TimeInterval,
} from '@/types';

// ============================================
// Configuration
// ============================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_TIMEOUT = 15000; // 15 seconds

// ============================================
// Custom API Error Class
// ============================================

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// ============================================
// API Client Class
// ============================================

class APIClient {
  // ----------------------------------------
  // Token Endpoints
  // ----------------------------------------

  async getTokens(): Promise<Token[]> {
    const response = await this.fetch<{ tokens: Token[]; total: number }>('/api/tokens');
    return response.tokens;
  }

  async getToken(symbol: string): Promise<Token | null> {
    try {
      const response = await this.fetch<Token>(`/api/tokens/${symbol}`);
      return response;
    } catch (error) {
      if (error instanceof APIError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async getTokenOHLCV(
    symbol: string,
    interval: TimeInterval = '1h',
    limit: number = 168
  ): Promise<OHLCV[]> {
    const response = await this.fetch<{ symbol: string; interval: string; data: OHLCV[] }>(
      `/api/tokens/${symbol}/ohlcv?interval=${interval}&limit=${limit}`
    );
    return response.data;
  }

  // ----------------------------------------
  // AI Analysis Endpoints
  // ----------------------------------------

  async analyzeToken(symbol: string): Promise<AnalysisResponse> {
    const response = await this.fetch<AnalysisResponse>('/api/analysis', {
      method: 'POST',
      body: JSON.stringify({ symbol }),
    });
    return response;
  }

  // ----------------------------------------
  // Trade Endpoints
  // ----------------------------------------

  async executeTrade(request: TradeRequest): Promise<TradeResponse> {
    const response = await this.fetch<TradeResponse>('/api/trades', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response;
  }

  async getTrades(): Promise<Trade[]> {
    const response = await this.fetch<{ trades: Trade[]; total: number }>('/api/trades/history');
    return response.trades;
  }

  // ----------------------------------------
  // Portfolio Endpoints
  // ----------------------------------------

  async getPortfolio(): Promise<Portfolio> {
    // Fetch from real API and map to frontend Portfolio type
    interface BackendPortfolio {
      totalValue: number;
      cash: number;
      holdingsValue: number;
      pnl: number;
      pnlPercentage: number;
      holdings: Array<{
        symbol: string;
        amount: number;
        avgPrice: number;
        currentPrice: number;
        value: number;
        pnl: number;
        pnlPercentage: number;
      }>;
    }

    const response = await this.fetch<BackendPortfolio>('/api/portfolio');
    
    // Map backend response to frontend Portfolio type
    const portfolio: Portfolio = {
      totalValue: response.totalValue,
      cashBalance: response.cash,
      pnl: response.pnl,
      pnlPercentage: response.pnlPercentage,
      holdings: response.holdings.map((h) => ({
        symbol: h.symbol,
        name: h.symbol, // Backend doesn't provide name, use symbol
        mintAddress: '', // Backend doesn't provide mint address
        amount: h.amount,
        value: h.value,
        avgBuyPrice: h.avgPrice,
        currentPrice: h.currentPrice,
        pnl: h.pnl,
        pnlPercentage: h.pnlPercentage,
      })),
      lastUpdated: Date.now(),
    };

    return portfolio;
  }

  // ----------------------------------------
  // Health Check
  // ----------------------------------------

  async healthCheck(): Promise<{ status: string; message?: string }> {
    try {
      const response = await this.fetch<{ status: string }>('/health');
      return { ...response };
    } catch (error) {
      return { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'API unavailable'
      };
    }
  }

  // ----------------------------------------
  // Helper Methods
  // ----------------------------------------

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new APIError(
          `API Error: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ''}`,
          response.status,
          endpoint
        );
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof APIError) {
        throw error;
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new APIError('Request timeout - server took too long to respond', undefined, endpoint);
        }
        
        // Network errors
        if (error.message.includes('fetch') || error.message.includes('network')) {
          throw new APIError(
            'Unable to connect to trading server. Please check your connection.',
            undefined,
            endpoint
          );
        }
        
        throw new APIError(error.message, undefined, endpoint);
      }
      
      throw new APIError('An unexpected error occurred', undefined, endpoint);
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

export const api = new APIClient();

// ============================================
// Convenience Functions
// ============================================

export async function fetchTokens(): Promise<Token[]> {
  return api.getTokens();
}

export async function fetchToken(symbol: string): Promise<Token | null> {
  return api.getToken(symbol);
}

export async function fetchOHLCV(
  symbol: string,
  interval?: TimeInterval,
  limit?: number
): Promise<OHLCV[]> {
  return api.getTokenOHLCV(symbol, interval, limit);
}

export async function analyzeToken(symbol: string): Promise<AnalysisResponse> {
  return api.analyzeToken(symbol);
}

export async function executeTrade(request: TradeRequest): Promise<TradeResponse> {
  return api.executeTrade(request);
}

export async function fetchPortfolio(): Promise<Portfolio> {
  return api.getPortfolio();
}

export async function fetchTrades(): Promise<Trade[]> {
  return api.getTrades();
}
