/**
 * WebSocket Client for Real-time Fraud Detection Updates
 * Handles live transaction feeds, fraud alerts, and real-time analytics
 */

import { log as logger } from '@/src/lib/logger';

export interface TransactionUpdate {
  id: string;
  timestamp: number;
  amount: number;
  merchant: string;
  location: string;
  customerEmail: string;
  fraudScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  status: 'processing' | 'approved' | 'flagged' | 'blocked';
}

export interface FraudAlert {
  id: string;
  timestamp: number;
  transactionId: string;
  fraudScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  amount: number;
  merchant: string;
  location: string;
  customerEmail: string;
  recommendedAction: 'approve' | 'review' | 'block';
}

export interface AnalyticsUpdate {
  timestamp: number;
  totalTransactions: number;
  fraudulentTransactions: number;
  fraudRate: number;
  transactionsPerMinute: number;
  alertsPerHour: number;
}

export type WebSocketEventType = 'transaction_update' | 'fraud_alert' | 'analytics_update' | 'connection_status';

export interface WebSocketEvent {
  type: WebSocketEventType;
  data: unknown;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private listeners: Map<WebSocketEventType, ((event: WebSocketEvent) => void)[]> = new Map();

  // WebSocket URL - in production, this would be configurable
  private wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws';

  constructor(wsUrl?: string) {
    if (wsUrl) {
      this.wsUrl = wsUrl;
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          const correlationId = logger.generateCorrelationId();
          logger.info('WebSocket connected', { correlationId });
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.emit('connection_status', { connected: true });
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketEvent = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            const correlationId = logger.generateCorrelationId();
            logger.error('Failed to parse WebSocket message', error instanceof Error ? error : new Error(String(error)), { correlationId });
          }
        };

        this.ws.onclose = (event) => {
          const correlationId = logger.generateCorrelationId();
          logger.info('WebSocket disconnected', { correlationId, metadata: { code: event.code, reason: event.reason } });
          this.stopHeartbeat();
          this.emit('connection_status', { connected: false, error: event.reason });

          // Attempt reconnection if not a normal closure
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnection();
          }
        };

        this.ws.onerror = () => {
          // Only log WebSocket errors in development, and only for actual connection issues
          const correlationId = logger.generateCorrelationId();
          logger.warn('WebSocket connection failed - no server available', { correlationId, metadata: { wsUrl: this.wsUrl } });
          this.emit('connection_status', { connected: false, error: 'Connection failed' });
          reject(new Error('WebSocket server not available'));
        };

      } catch (error) {
        const correlationId = logger.generateCorrelationId();
        logger.error('Failed to create WebSocket connection', error instanceof Error ? error : new Error(String(error)), { correlationId });
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.ws) {
      this.stopHeartbeat();
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  /**
   * Send a message to the WebSocket server
   */
  send(type: string, data: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  /**
   * Subscribe to WebSocket events
   */
  on(eventType: WebSocketEventType, callback: (event: WebSocketEvent) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  /**
   * Unsubscribe from WebSocket events
   */
  off(eventType: WebSocketEventType, callback: (event: WebSocketEvent) => void): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Subscribe to fraud alerts only
   */
  onFraudAlert(callback: (alert: FraudAlert) => void): void {
    this.on('fraud_alert', (event) => {
      if (event.type === 'fraud_alert') {
        callback(event.data as FraudAlert);
      }
    });
  }

  /**
   * Subscribe to transaction updates only
   */
  onTransactionUpdate(callback: (update: TransactionUpdate) => void): void {
    this.on('transaction_update', (event) => {
      if (event.type === 'transaction_update') {
        callback(event.data as TransactionUpdate);
      }
    });
  }

  /**
   * Subscribe to analytics updates only
   */
  onAnalyticsUpdate(callback: (update: AnalyticsUpdate) => void): void {
    this.on('analytics_update', (event) => {
      if (event.type === 'analytics_update') {
        callback(event.data as AnalyticsUpdate);
      }
    });
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Request subscription to specific data streams
   */
  subscribeToAlerts(): void {
    this.send('subscribe', { stream: 'fraud_alerts' });
  }

  subscribeToTransactions(): void {
    this.send('subscribe', { stream: 'transactions' });
  }

  subscribeToAnalytics(): void {
    this.send('subscribe', { stream: 'analytics' });
  }

  private handleMessage(event: WebSocketEvent): void {
    this.emit(event.type, event.data);
  }

  private emit(eventType: WebSocketEventType, data: unknown): void {
    const event: WebSocketEvent = { type: eventType, data };
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }
  }

  private attemptReconnection(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    const correlationId = logger.generateCorrelationId();
    logger.info('Attempting WebSocket reconnection', { correlationId, metadata: { attempt: this.reconnectAttempts, maxAttempts: this.maxReconnectAttempts, delay } });

    setTimeout(() => {
      this.connect().catch(() => {
        // Reconnection failed, will retry if attempts remaining
      });
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// React hook for using WebSocket client
export function useWebSocket() {
  return new WebSocketClient();
}

// Singleton instance for global use
export const wsClient = new WebSocketClient();
