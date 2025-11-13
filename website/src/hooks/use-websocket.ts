'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketClient, TransactionUpdate, FraudAlert, AnalyticsUpdate, WebSocketEventType, WebSocketEvent } from '@/src/services/';

export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  error?: string;
}

export function useWebSocket(autoConnect = false) {
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const autoConnectRef = useRef(autoConnect);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    reconnecting: false,
  });

  const [transactionUpdates, setTransactionUpdates] = useState<TransactionUpdate[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [analyticsUpdates, setAnalyticsUpdates] = useState<AnalyticsUpdate[]>([]);

  const connect = useCallback(async () => {
    if (!wsClientRef.current) return;

    try {
      setConnectionStatus(prev => ({ ...prev, reconnecting: true }));
      await wsClientRef.current.connect();

      // Subscribe to data streams
      wsClientRef.current.subscribeToAlerts();
      wsClientRef.current.subscribeToTransactions();
      wsClientRef.current.subscribeToAnalytics();

      // Mark as auto-connected
      autoConnectRef.current = false;

    } catch {
      // Only log connection errors in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('WebSocket connection failed - server not available');
      }
      setConnectionStatus({
        connected: false,
        reconnecting: false,
        error: 'Server not available',
      });
    }
  }, []);

  // Initialize WebSocket client
  useEffect(() => {
    wsClientRef.current = new WebSocketClient();

    // Set up connection status listener
    wsClientRef.current.on('connection_status', (event) => {
      const { connected, error } = event.data as { connected: boolean; error?: string };
      setConnectionStatus({
        connected,
        reconnecting: !connected && !error,
        error,
      });
    });

    // Set up transaction update listener
    wsClientRef.current.onTransactionUpdate((update) => {
      setTransactionUpdates(prev => [update, ...prev.slice(0, 49)]); // Keep last 50 updates
    });

    // Set up fraud alert listener
    wsClientRef.current.onFraudAlert((alert) => {
      setFraudAlerts(prev => [alert, ...prev.slice(0, 19)]); // Keep last 20 alerts
    });

    // Set up analytics update listener
    wsClientRef.current.onAnalyticsUpdate((update) => {
      setAnalyticsUpdates(prev => [update, ...prev.slice(0, 9)]); // Keep last 10 updates
    });

    // Auto-connect after initialization (avoid synchronous setState)
    if (autoConnectRef.current) {
      const timer = setTimeout(() => {
        connect();
      }, 0);
      return () => {
        clearTimeout(timer);
        if (wsClientRef.current) {
          wsClientRef.current.disconnect();
        }
      };
    }

    // Cleanup on unmount
    return () => {
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
      }
    };
  }, [connect]);

  const disconnect = useCallback(() => {
    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
    }
  }, []);

  const subscribe = useCallback((eventType: WebSocketEventType, callback: (event: WebSocketEvent) => void) => {
    if (wsClientRef.current) {
      wsClientRef.current.on(eventType, callback);
    }
  }, []);

  const unsubscribe = useCallback((eventType: WebSocketEventType, callback: (event: WebSocketEvent) => void) => {
    if (wsClientRef.current) {
      wsClientRef.current.off(eventType, callback);
    }
  }, []);

  return {
    // Connection status
    connectionStatus,

    // Data streams
    transactionUpdates,
    fraudAlerts,
    analyticsUpdates,

    // Control methods
    connect,
    disconnect,
    subscribe,
    unsubscribe,

    // Utility methods
    isConnected: connectionStatus.connected,
    clearTransactionUpdates: () => setTransactionUpdates([]),
    clearFraudAlerts: () => setFraudAlerts([]),
    clearAnalyticsUpdates: () => setAnalyticsUpdates([]),
  };
}
