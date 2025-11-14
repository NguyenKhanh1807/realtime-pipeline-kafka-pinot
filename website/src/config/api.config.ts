/**
 * API Configuration Service
 * Centralized configuration for all API endpoints and settings
 */

/**
 * API Configuration
 * Reads from environment variables with fallback defaults
 */
export const apiConfig = {
  pinot: {
    baseUrl: process.env.NEXT_PUBLIC_PINOT_URL || 'http://localhost:9000',
    timeout: 10000, // 10 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  },
  userManagement: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000',
    timeout: 5000, // 5 seconds
    retryAttempts: 2,
    retryDelay: 500, // 0.5 seconds
  },
  websocket: {
    url: process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:9000/ws',
    reconnectInterval: 3000, // 3 seconds
    maxReconnectAttempts: 5,
  },
} as const;

/**
 * Validate configuration on module load
 * Logs warnings if using default values in production
 */
if (typeof window !== 'undefined') {
  if (process.env.NODE_ENV === 'production') {
    if (apiConfig.pinot.baseUrl.includes('localhost')) {
      console.warn('⚠️ Using default Pinot URL in production. Set NEXT_PUBLIC_PINOT_URL environment variable.');
    }
    if (apiConfig.userManagement.baseUrl.includes('localhost')) {
      console.warn('⚠️ Using default User Management API URL in production. Set NEXT_PUBLIC_API_URL environment variable.');
    }
  }
}

