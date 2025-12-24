// ============================================
// Token Types
// ============================================

export interface Token {
  symbol: string;
  name: string;
  mintAddress: string;
  price: number;
  priceChange24h: number;
  priceChange7d: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  holders: number;
  logoUrl?: string;
}

// ============================================
// OHLCV / Chart Types
// ============================================

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartDataPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type TimeInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

// ============================================
// AI Analysis Types
// ============================================

export type Decision = 'BUY' | 'NO_BUY' | 'SELL' | 'HOLD';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type VolumeTrend = 'INCREASING' | 'DECREASING' | 'STABLE';

export interface AnalysisIndicators {
  rsi: number;
  volumeTrend: VolumeTrend;
  priceAction: string;
  macdSignal?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  supportLevel?: number;
  resistanceLevel?: number;
}

export interface AnalysisRequest {
  symbol: string;
  tokenData?: Token;
  ohlcv?: OHLCV[];
}

export interface AnalysisResponse {
  decision: Decision;
  confidence: number; // 0-100
  reasoning: string;
  riskLevel: RiskLevel;
  indicators: AnalysisIndicators;
  timestamp: number;
}

// ============================================
// Trade Types
// ============================================

export type TradeType = 'BUY' | 'SELL';
export type TradeStatus = 'PENDING' | 'EXECUTED' | 'FAILED' | 'CANCELLED';

export interface TradeRequest {
  symbol: string;
  type: TradeType;
  amount: number; // For BUY: USD value, For SELL: Token amount
  slippageBps: number; // Basis points (50 = 0.5%)
}

export interface TradeResponse {
  id: string;
  status: TradeStatus;
  symbol: string;
  type: TradeType;
  amountIn: number;
  amountOut: number;
  price: number;
  fee: number;
  txHash?: string; // Only for real trades
  isPaperTrade?: boolean;
  timestamp: number;
  error?: string;
}

export interface Trade extends TradeResponse {
  pnl?: number;
  pnlPercentage?: number;
}

// ============================================
// Portfolio Types
// ============================================

export interface Holding {
  symbol: string;
  name: string;
  mintAddress: string;
  amount: number;
  value: number;
  avgBuyPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercentage: number;
  logoUrl?: string;
}

export interface Portfolio {
  totalValue: number;
  cashBalance: number;
  pnl: number;
  pnlPercentage: number;
  holdings: Holding[];
  lastUpdated: number;
}

// ============================================
// UI State Types
// ============================================

export interface TableSortConfig {
  key: keyof Token;
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
  minLiquidity?: number;
  minVolume?: number;
  minMarketCap?: number;
  search?: string;
}

export interface NotificationMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
}

// ============================================
// API Response Types
// ============================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================
// WebSocket Types
// ============================================

export interface WSMessage {
  type: 'price_update' | 'trade_update' | 'analysis_complete';
  payload: unknown;
  timestamp: number;
}

export interface PriceUpdate {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
}

// ============================================
// AI Decision Queue Types
// ============================================

export type AIRecommendationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'EXECUTED';

export interface AIRecommendation {
  id: string;
  symbol: string;
  tokenName: string;
  logoUrl?: string;
  decision: Decision;
  confidence: number;
  reasoning: string;
  riskLevel: RiskLevel;
  indicators: AnalysisIndicators;
  suggestedAmount: number; // USD value
  suggestedSlippage: number; // bps
  currentPrice: number;
  targetPrice?: number;
  stopLoss?: number;
  potentialProfit?: number; // percentage
  potentialLoss?: number; // percentage
  status: AIRecommendationStatus;
  createdAt: number;
  expiresAt: number;
  executedAt?: number;
  tradeId?: string;
}

export interface AISettings {
  autoScan: boolean;
  scanInterval: number; // seconds
  minConfidence: number; // 0-100
  maxRiskLevel: RiskLevel;
  defaultTradeAmount: number; // USD
  autoApproveThreshold?: number; // confidence level to auto-approve (optional)
}
