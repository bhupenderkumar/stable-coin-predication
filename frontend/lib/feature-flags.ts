// ============================================
// Feature Flags Configuration
// ============================================

export interface FeatureFlags {
  // Feature Toggles
  ENABLE_TRADING: boolean; // Enable/disable trade execution
  ENABLE_AI_ANALYSIS: boolean; // Enable/disable AI features
  ENABLE_WEBSOCKET: boolean; // Real-time updates
  ENABLE_PORTFOLIO: boolean; // Portfolio tracking
  ENABLE_NOTIFICATIONS: boolean; // Toast notifications

  // Environment
  USE_DEVNET: boolean; // Solana devnet vs mainnet
  DEBUG_MODE: boolean; // Verbose logging

  // UI Features
  ENABLE_DARK_MODE: boolean; // Dark mode toggle
  ENABLE_PRICE_ALERTS: boolean; // Price alert system
  ENABLE_ADVANCED_CHARTS: boolean; // Advanced charting features
}

// ============================================
// Default Configuration (Development)
// ============================================

export const defaultFlags: FeatureFlags = {
  ENABLE_TRADING: true,
  ENABLE_AI_ANALYSIS: true,
  ENABLE_WEBSOCKET: false,
  ENABLE_PORTFOLIO: true,
  ENABLE_NOTIFICATIONS: true,
  USE_DEVNET: true,
  DEBUG_MODE: true,
  ENABLE_DARK_MODE: true,
  ENABLE_PRICE_ALERTS: false,
  ENABLE_ADVANCED_CHARTS: true,
};

// ============================================
// Production Configuration
// ============================================

export const productionFlags: FeatureFlags = {
  ENABLE_TRADING: true,
  ENABLE_AI_ANALYSIS: true,
  ENABLE_WEBSOCKET: true,
  ENABLE_PORTFOLIO: true,
  ENABLE_NOTIFICATIONS: true,
  USE_DEVNET: false,
  DEBUG_MODE: false,
  ENABLE_DARK_MODE: true,
  ENABLE_PRICE_ALERTS: true,
  ENABLE_ADVANCED_CHARTS: true,
};

// ============================================
// Staging Configuration
// ============================================

export const stagingFlags: FeatureFlags = {
  ENABLE_TRADING: true,
  ENABLE_AI_ANALYSIS: true,
  ENABLE_WEBSOCKET: true,
  ENABLE_PORTFOLIO: true,
  ENABLE_NOTIFICATIONS: true,
  USE_DEVNET: true,
  DEBUG_MODE: true,
  ENABLE_DARK_MODE: true,
  ENABLE_PRICE_ALERTS: false,
  ENABLE_ADVANCED_CHARTS: true,
};

// ============================================
// Environment Detection
// ============================================

type Environment = 'development' | 'staging' | 'production';

function getEnvironment(): Environment {
  const env = process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV;
  
  if (env === 'production') return 'production';
  if (env === 'staging') return 'staging';
  return 'development';
}

// ============================================
// Get Feature Flags
// ============================================

let cachedFlags: FeatureFlags | null = null;

export function getFeatureFlags(): FeatureFlags {
  // Return cached flags if available (for consistency during runtime)
  if (cachedFlags) {
    return cachedFlags;
  }

  const env = getEnvironment();

  // Start with environment-based defaults
  let flags: FeatureFlags;
  switch (env) {
    case 'production':
      flags = { ...productionFlags };
      break;
    case 'staging':
      flags = { ...stagingFlags };
      break;
    default:
      flags = { ...defaultFlags };
  }

  // Override from environment variables (allows runtime configuration)
  if (typeof window !== 'undefined' || typeof process !== 'undefined') {
    const envOverrides: Partial<FeatureFlags> = {
      ENABLE_TRADING: parseBoolEnv('NEXT_PUBLIC_ENABLE_TRADING', flags.ENABLE_TRADING),
      ENABLE_AI_ANALYSIS: parseBoolEnv('NEXT_PUBLIC_ENABLE_AI', flags.ENABLE_AI_ANALYSIS),
      ENABLE_WEBSOCKET: parseBoolEnv('NEXT_PUBLIC_ENABLE_WS', flags.ENABLE_WEBSOCKET),
      ENABLE_PORTFOLIO: parseBoolEnv('NEXT_PUBLIC_ENABLE_PORTFOLIO', flags.ENABLE_PORTFOLIO),
      USE_DEVNET: parseBoolEnv('NEXT_PUBLIC_USE_DEVNET', flags.USE_DEVNET),
      DEBUG_MODE: parseBoolEnv('NEXT_PUBLIC_DEBUG', flags.DEBUG_MODE),
    };

    flags = { ...flags, ...envOverrides };
  }

  // Cache the flags
  cachedFlags = flags;

  // Log flags in debug mode
  if (flags.DEBUG_MODE && typeof console !== 'undefined') {
    console.log('[FeatureFlags] Environment:', env);
    console.log('[FeatureFlags] Active flags:', flags);
  }

  return flags;
}

// ============================================
// Helper Functions
// ============================================

function parseBoolEnv(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return defaultValue;
}

// Check if a specific feature is enabled
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[feature] === true;
}

// Get network mode string for display
export function getNetworkModeLabel(): string {
  const flags = getFeatureFlags();
  return flags.USE_DEVNET ? 'Devnet' : 'Mainnet';
}

// Get network configuration
export function getNetworkConfig(): { name: string; rpcUrl: string } {
  const flags = getFeatureFlags();
  
  if (flags.USE_DEVNET) {
    return {
      name: 'Devnet',
      rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    };
  }
  
  return {
    name: 'Mainnet',
    rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  };
}

// Reset cached flags (useful for testing)
export function resetFeatureFlags(): void {
  cachedFlags = null;
}

// ============================================
// React Hook for Feature Flags
// ============================================

import { useState, useEffect } from 'react';

export function useFeatureFlags(): FeatureFlags {
  const [flags, setFlags] = useState<FeatureFlags>(getFeatureFlags);

  useEffect(() => {
    // In case flags need to be updated (e.g., from remote config)
    setFlags(getFeatureFlags());
  }, []);

  return flags;
}

export function useFeature(feature: keyof FeatureFlags): boolean {
  const flags = useFeatureFlags();
  return flags[feature] === true;
}
