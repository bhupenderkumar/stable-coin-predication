import { Token, OHLCV, AnalysisResponse, Portfolio, Trade } from '@/types';

// ============================================
// Mock Tokens Data
// ============================================

export const mockTokens: Token[] = [
  {
    symbol: 'BONK',
    name: 'Bonk',
    mintAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    price: 0.00002341,
    priceChange24h: 5.67,
    priceChange7d: -12.34,
    volume24h: 45000000,
    liquidity: 8500000,
    marketCap: 1450000000,
    holders: 567890,
    logoUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/logo.png',
  },
  {
    symbol: 'WIF',
    name: 'dogwifhat',
    mintAddress: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    price: 2.45,
    priceChange24h: -3.21,
    priceChange7d: 24.56,
    volume24h: 120000000,
    liquidity: 25000000,
    marketCap: 2400000000,
    holders: 234567,
    logoUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm/logo.png',
  },
  {
    symbol: 'POPCAT',
    name: 'Popcat',
    mintAddress: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
    price: 0.89,
    priceChange24h: 15.43,
    priceChange7d: 45.67,
    volume24h: 35000000,
    liquidity: 12000000,
    marketCap: 870000000,
    holders: 123456,
    logoUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr/logo.png',
  },
  {
    symbol: 'MYRO',
    name: 'Myro',
    mintAddress: 'HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4',
    price: 0.12,
    priceChange24h: 8.90,
    priceChange7d: -5.43,
    volume24h: 18000000,
    liquidity: 5600000,
    marketCap: 120000000,
    holders: 45678,
    logoUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4/logo.png',
  },
  {
    symbol: 'SAMO',
    name: 'Samoyedcoin',
    mintAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    price: 0.0089,
    priceChange24h: -2.15,
    priceChange7d: 8.90,
    volume24h: 5600000,
    liquidity: 3200000,
    marketCap: 35000000,
    holders: 78901,
    logoUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU/logo.png',
  },
  {
    symbol: 'BOME',
    name: 'Book of Meme',
    mintAddress: 'ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82',
    price: 0.0123,
    priceChange24h: 12.45,
    priceChange7d: 67.89,
    volume24h: 89000000,
    liquidity: 15000000,
    marketCap: 780000000,
    holders: 198765,
    logoUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82/logo.png',
  },
  {
    symbol: 'MEW',
    name: 'cat in a dogs world',
    mintAddress: 'MEW1gQWJ3nEXg2qgwoLuxsLvUVmvJTG4FuQBMbQFHZc',
    price: 0.0067,
    priceChange24h: -8.32,
    priceChange7d: -15.67,
    volume24h: 28000000,
    liquidity: 8900000,
    marketCap: 620000000,
    holders: 156789,
    logoUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/MEW1gQWJ3nEXg2qgwoLuxsLvUVmvJTG4FuQBMbQFHZc/logo.png',
  },
  {
    symbol: 'SLERF',
    name: 'SLERF',
    mintAddress: '7BgBvyjrZX1YKz4oh9mjb8ZScatkkwb8DzFx7LoiVkM3',
    price: 0.234,
    priceChange24h: 4.56,
    priceChange7d: -23.45,
    volume24h: 15000000,
    liquidity: 4500000,
    marketCap: 230000000,
    holders: 89012,
    logoUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7BgBvyjrZX1YKz4oh9mjb8ZScatkkwb8DzFx7LoiVkM3/logo.png',
  },
];

// ============================================
// Mock OHLCV Data Generator
// ============================================

function generateOHLCV(
  basePrice: number,
  days: number = 7,
  interval: number = 60 // minutes
): OHLCV[] {
  const data: OHLCV[] = [];
  const now = Date.now();
  const intervalMs = interval * 60 * 1000;
  const totalCandles = (days * 24 * 60) / interval;

  let currentPrice = basePrice * (0.7 + Math.random() * 0.3); // Start at 70-100% of current price

  for (let i = totalCandles; i >= 0; i--) {
    const timestamp = now - i * intervalMs;
    const volatility = 0.02 + Math.random() * 0.03; // 2-5% volatility
    const direction = Math.random() > 0.48 ? 1 : -1; // Slight bullish bias

    const change = currentPrice * volatility * direction;
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = 1000000 + Math.random() * 5000000;

    data.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume,
    });

    currentPrice = close;
  }

  // Adjust last candle to match current price
  if (data.length > 0) {
    data[data.length - 1].close = basePrice;
  }

  return data;
}

export const mockOHLCV: Record<string, OHLCV[]> = {
  BONK: generateOHLCV(0.00002341),
  WIF: generateOHLCV(2.45),
  POPCAT: generateOHLCV(0.89),
  MYRO: generateOHLCV(0.12),
  SAMO: generateOHLCV(0.0089),
  BOME: generateOHLCV(0.0123),
  MEW: generateOHLCV(0.0067),
  SLERF: generateOHLCV(0.234),
  default: generateOHLCV(1.0),
};

// ============================================
// Mock AI Analysis Responses
// ============================================

export const mockAnalysis: Record<string, AnalysisResponse> = {
  BONK: {
    decision: 'NO_BUY',
    confidence: 45,
    reasoning:
      'RSI at 72 indicates overbought conditions. Volume declining over past 7 days suggests weakening momentum. Wait for pullback to better entry point around $0.000018.',
    riskLevel: 'HIGH',
    indicators: {
      rsi: 72,
      volumeTrend: 'DECREASING',
      priceAction: 'Consolidating after recent pump',
      macdSignal: 'BEARISH',
      supportLevel: 0.000018,
      resistanceLevel: 0.000028,
    },
    timestamp: Date.now(),
  },
  WIF: {
    decision: 'BUY',
    confidence: 78,
    reasoning:
      'Strong 7-day momentum with healthy RSI at 58. High liquidity ($25M) reduces slippage risk. Volume increasing suggests continued institutional interest. Target: $3.20.',
    riskLevel: 'MEDIUM',
    indicators: {
      rsi: 58,
      volumeTrend: 'INCREASING',
      priceAction: 'Uptrend with higher highs and higher lows',
      macdSignal: 'BULLISH',
      supportLevel: 2.10,
      resistanceLevel: 3.20,
    },
    timestamp: Date.now(),
  },
  POPCAT: {
    decision: 'BUY',
    confidence: 85,
    reasoning:
      'Exceptional momentum with 45% weekly gain. RSI at 65 still has room to run before overbought. Strong volume confirms trend. Good liquidity for entry/exit. Viral social sentiment.',
    riskLevel: 'MEDIUM',
    indicators: {
      rsi: 65,
      volumeTrend: 'INCREASING',
      priceAction: 'Strong uptrend breakout above key resistance',
      macdSignal: 'BULLISH',
      supportLevel: 0.72,
      resistanceLevel: 1.15,
    },
    timestamp: Date.now(),
  },
  MYRO: {
    decision: 'HOLD',
    confidence: 55,
    reasoning:
      'Mixed signals - positive 24h momentum but negative weekly trend. RSI neutral at 52. Wait for clearer direction before entering new position.',
    riskLevel: 'MEDIUM',
    indicators: {
      rsi: 52,
      volumeTrend: 'STABLE',
      priceAction: 'Ranging between support and resistance',
      macdSignal: 'NEUTRAL',
      supportLevel: 0.095,
      resistanceLevel: 0.145,
    },
    timestamp: Date.now(),
  },
  SAMO: {
    decision: 'BUY',
    confidence: 62,
    reasoning:
      'Oversold conditions with RSI at 35 presenting potential reversal opportunity. Established community with strong holder base. Low risk entry at current levels.',
    riskLevel: 'LOW',
    indicators: {
      rsi: 35,
      volumeTrend: 'STABLE',
      priceAction: 'Testing major support level',
      macdSignal: 'NEUTRAL',
      supportLevel: 0.0075,
      resistanceLevel: 0.012,
    },
    timestamp: Date.now(),
  },
  BOME: {
    decision: 'BUY',
    confidence: 82,
    reasoning:
      'Massive momentum with 67% weekly gain. High volume confirms strong buying pressure. RSI at 70 approaching overbought but trend strength justifies entry. Set tight stop-loss.',
    riskLevel: 'HIGH',
    indicators: {
      rsi: 70,
      volumeTrend: 'INCREASING',
      priceAction: 'Parabolic move with strong momentum',
      macdSignal: 'BULLISH',
      supportLevel: 0.0095,
      resistanceLevel: 0.018,
    },
    timestamp: Date.now(),
  },
  MEW: {
    decision: 'NO_BUY',
    confidence: 72,
    reasoning:
      'Downtrend with consecutive negative days. RSI at 38 not yet oversold enough for reversal play. Volume decreasing indicates lack of buyer interest. Wait for capitulation.',
    riskLevel: 'HIGH',
    indicators: {
      rsi: 38,
      volumeTrend: 'DECREASING',
      priceAction: 'Lower highs and lower lows',
      macdSignal: 'BEARISH',
      supportLevel: 0.0045,
      resistanceLevel: 0.0085,
    },
    timestamp: Date.now(),
  },
  SLERF: {
    decision: 'HOLD',
    confidence: 48,
    reasoning:
      'High volatility token with unpredictable price action. Recent controversy may affect sentiment. Not recommended for new entries but existing positions can hold.',
    riskLevel: 'HIGH',
    indicators: {
      rsi: 45,
      volumeTrend: 'DECREASING',
      priceAction: 'Choppy sideways movement',
      macdSignal: 'NEUTRAL',
      supportLevel: 0.18,
      resistanceLevel: 0.32,
    },
    timestamp: Date.now(),
  },
  default: {
    decision: 'HOLD',
    confidence: 50,
    reasoning: 'Insufficient data for confident analysis. Recommend further research before trading.',
    riskLevel: 'MEDIUM',
    indicators: {
      rsi: 50,
      volumeTrend: 'STABLE',
      priceAction: 'Neutral',
    },
    timestamp: Date.now(),
  },
};

// ============================================
// Mock Portfolio Data
// ============================================

export const mockPortfolio: Portfolio = {
  totalValue: 10000,
  cashBalance: 5000,
  pnl: 1234.56,
  pnlPercentage: 14.07,
  holdings: [
    {
      symbol: 'WIF',
      name: 'dogwifhat',
      mintAddress: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
      amount: 1000,
      value: 2450,
      avgBuyPrice: 2.10,
      currentPrice: 2.45,
      pnl: 350,
      pnlPercentage: 16.67,
    },
    {
      symbol: 'POPCAT',
      name: 'Popcat',
      mintAddress: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
      amount: 2000,
      value: 1780,
      avgBuyPrice: 0.65,
      currentPrice: 0.89,
      pnl: 480,
      pnlPercentage: 36.92,
    },
    {
      symbol: 'BONK',
      name: 'Bonk',
      mintAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      amount: 50000000,
      value: 1170.5,
      avgBuyPrice: 0.00002500,
      currentPrice: 0.00002341,
      pnl: -79.5,
      pnlPercentage: -6.36,
    },
  ],
  lastUpdated: Date.now(),
};

// ============================================
// Mock Trade History
// ============================================

export const mockTrades: Trade[] = [
  {
    id: 'trade_001',
    status: 'EXECUTED',
    symbol: 'WIF',
    type: 'BUY',
    amountIn: 1000,
    amountOut: 476.19,
    price: 2.10,
    fee: 3.0,
    timestamp: Date.now() - 86400000 * 3, // 3 days ago
  },
  {
    id: 'trade_002',
    status: 'EXECUTED',
    symbol: 'POPCAT',
    type: 'BUY',
    amountIn: 1300,
    amountOut: 2000,
    price: 0.65,
    fee: 3.9,
    timestamp: Date.now() - 86400000 * 2, // 2 days ago
  },
  {
    id: 'trade_003',
    status: 'EXECUTED',
    symbol: 'BONK',
    type: 'BUY',
    amountIn: 1250,
    amountOut: 50000000,
    price: 0.000025,
    fee: 3.75,
    timestamp: Date.now() - 86400000, // 1 day ago
  },
  {
    id: 'trade_004',
    status: 'EXECUTED',
    symbol: 'SAMO',
    type: 'SELL',
    amountIn: 100000,
    amountOut: 890,
    price: 0.0089,
    fee: 2.67,
    timestamp: Date.now() - 43200000, // 12 hours ago
  },
];

// ============================================
// Helper to get random price fluctuation
// ============================================

export function getRandomPriceUpdate(token: Token): Token {
  const fluctuation = (Math.random() - 0.5) * 0.02; // ±1% fluctuation
  const newPrice = token.price * (1 + fluctuation);
  const newChange24h = token.priceChange24h + (Math.random() - 0.5) * 0.5;
  
  return {
    ...token,
    price: newPrice,
    priceChange24h: newChange24h,
  };
}
