import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ============================================
// Class Name Utility
// ============================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================
// Number Formatting
// ============================================

export function formatCurrency(
  value: number,
  currency: string = 'USD',
  maximumFractionDigits: number = 2
): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits,
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatPrice(price: number): string {
  if (price === 0) return '$0.00';
  
  // For very small numbers (like meme coins)
  if (price < 0.0001) {
    return `$${price.toExponential(4)}`;
  }
  
  if (price < 0.01) {
    return `$${price.toFixed(6)}`;
  }
  
  if (price < 1) {
    return `$${price.toFixed(4)}`;
  }
  
  if (price < 1000) {
    return `$${price.toFixed(2)}`;
  }
  
  return formatCurrency(price);
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

export function formatCompactNumber(value: number): string {
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(2)}B`;
  }
  if (value >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M`;
  }
  if (value >= 1e3) {
    return `${(value / 1e3).toFixed(2)}K`;
  }
  return value.toFixed(2);
}

export function formatVolume(volume: number): string {
  return `$${formatCompactNumber(volume)}`;
}

export function formatMarketCap(marketCap: number): string {
  return `$${formatCompactNumber(marketCap)}`;
}

export function formatPercentage(value: number, decimals: number = 2): string {
  const formatted = Math.abs(value).toFixed(decimals);
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${formatted}%`;
}

// ============================================
// Date/Time Formatting
// ============================================

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return formatDate(timestamp);
}

// ============================================
// Color Utilities
// ============================================

export function getPriceChangeColor(change: number): string {
  if (change > 0) return 'text-bullish';
  if (change < 0) return 'text-bearish';
  return 'text-muted-foreground';
}

export function getPriceChangeBgColor(change: number): string {
  if (change > 0) return 'bg-bullish/10';
  if (change < 0) return 'bg-bearish/10';
  return 'bg-muted';
}

export function getRiskLevelColor(risk: 'LOW' | 'MEDIUM' | 'HIGH'): string {
  switch (risk) {
    case 'LOW':
      return 'text-bullish';
    case 'MEDIUM':
      return 'text-yellow-500';
    case 'HIGH':
      return 'text-bearish';
    default:
      return 'text-muted-foreground';
  }
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 70) return 'text-bullish';
  if (confidence >= 50) return 'text-yellow-500';
  return 'text-bearish';
}

export function getDecisionColor(decision: string): string {
  switch (decision) {
    case 'BUY':
      return 'text-bullish bg-bullish/10';
    case 'SELL':
      return 'text-bearish bg-bearish/10';
    case 'NO_BUY':
      return 'text-bearish bg-bearish/10';
    case 'HOLD':
      return 'text-yellow-500 bg-yellow-500/10';
    default:
      return 'text-muted-foreground bg-muted';
  }
}

// ============================================
// Validation Utilities
// ============================================

export function isValidAmount(amount: string | number): boolean {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(num) && num > 0 && isFinite(num);
}

export function isValidSlippage(slippage: number): boolean {
  return slippage >= 1 && slippage <= 5000; // 0.01% to 50%
}

// ============================================
// Wallet Utilities
// ============================================

export function shortenAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

// ============================================
// Debounce Utility
// ============================================

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

// ============================================
// Local Storage Utilities
// ============================================

export function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.error('Failed to save to localStorage');
  }
}

// ============================================
// Technical Analysis Helpers
// ============================================

export function getRSIStatus(rsi: number): { label: string; color: string } {
  if (rsi >= 70) return { label: 'Overbought', color: 'text-bearish' };
  if (rsi <= 30) return { label: 'Oversold', color: 'text-bullish' };
  return { label: 'Neutral', color: 'text-muted-foreground' };
}

export function getVolumeTrendIcon(trend: 'INCREASING' | 'DECREASING' | 'STABLE'): string {
  switch (trend) {
    case 'INCREASING':
      return '📈';
    case 'DECREASING':
      return '📉';
    case 'STABLE':
      return '➡️';
    default:
      return '';
  }
}
