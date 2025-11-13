/**
 * WebSocket Repository Interface
 * Defines the contract for WebSocket connection management
 * Note: WebSocket is different from data repositories - it manages real-time connections
 */

import type { TransactionUpdate, FraudAlert, AnalyticsUpdate, WebSocketEventType, WebSocketEvent } from '@/src/services/websocket-client';

export interface WebSocketRepository {
  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void>;

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void;

  /**
   * Subscribe to transaction updates
   */
  subscribeToTransactions(): void;

  /**
   * Subscribe to fraud alerts
   */
  subscribeToAlerts(): void;

  /**
   * Subscribe to analytics updates
   */
  subscribeToAnalytics(): void;

  /**
   * Subscribe to a specific event type
   */
  on(eventType: WebSocketEventType, callback: (event: WebSocketEvent) => void): void;

  /**
   * Unsubscribe from a specific event type
   */
  off(eventType: WebSocketEventType, callback: (event: WebSocketEvent) => void): void;

  /**
   * Register callback for transaction updates
   */
  onTransactionUpdate(callback: (update: TransactionUpdate) => void): void;

  /**
   * Register callback for fraud alerts
   */
  onFraudAlert(callback: (alert: FraudAlert) => void): void;

  /**
   * Register callback for analytics updates
   */
  onAnalyticsUpdate(callback: (update: AnalyticsUpdate) => void): void;

  /**
   * Check if connected
   */
  isConnected(): boolean;
}

