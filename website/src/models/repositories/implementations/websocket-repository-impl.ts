/**
 * WebSocket Repository Implementation
 * Wraps WebSocketClient to provide repository abstraction
 */

import type { WebSocketRepository } from '../websocket-repository';
import type { TransactionUpdate, FraudAlert, AnalyticsUpdate, WebSocketEventType, WebSocketEvent } from '@/src/services/websocket-client';
import { WebSocketClient } from '@/src/services/websocket-client';

export class WebSocketRepositoryImpl implements WebSocketRepository {
  private client: WebSocketClient;

  constructor(wsUrl?: string) {
    this.client = new WebSocketClient(wsUrl);
  }

  async connect(): Promise<void> {
    return this.client.connect();
  }

  disconnect(): void {
    this.client.disconnect();
  }

  subscribeToTransactions(): void {
    this.client.subscribeToTransactions();
  }

  subscribeToAlerts(): void {
    this.client.subscribeToAlerts();
  }

  subscribeToAnalytics(): void {
    this.client.subscribeToAnalytics();
  }

  on(eventType: WebSocketEventType, callback: (event: WebSocketEvent) => void): void {
    this.client.on(eventType, callback);
  }

  off(eventType: WebSocketEventType, callback: (event: WebSocketEvent) => void): void {
    this.client.off(eventType, callback);
  }

  onTransactionUpdate(callback: (update: TransactionUpdate) => void): void {
    this.client.onTransactionUpdate(callback);
  }

  onFraudAlert(callback: (alert: FraudAlert) => void): void {
    this.client.onFraudAlert(callback);
  }

  onAnalyticsUpdate(callback: (update: AnalyticsUpdate) => void): void {
    this.client.onAnalyticsUpdate(callback);
  }

  isConnected(): boolean {
    return this.client.isConnected();
  }
}

