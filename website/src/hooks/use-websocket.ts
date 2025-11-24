'use client';

import { useEffect, useCallback } from 'react';
import { 
  useWebSocketStore,
  type TransactionUpdate,
  type FraudAlert,
  type AnalyticsUpdate,
  type ConnectionStatus
} from '@/src/view-models/stores';
import type { WebSocketEventType, WebSocketEvent } from '@/src/services/websocket-client';

export function useWebSocket(autoConnect = false) {
  // Use ViewModel store instead of direct service access
  const {
    connectionStatus,
    transactionUpdates,
    fraudAlerts,
    analyticsUpdates,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    clearTransactionUpdates,
    clearFraudAlerts,
    clearAnalyticsUpdates,
    initialize,
  } = useWebSocketStore();

  // Initialize WebSocket client on mount
  useEffect(() => {
    initialize();

    // Auto-connect if requested
    if (autoConnect) {
      const timer = setTimeout(() => {
        connect();
      }, 0);
      return () => {
        clearTimeout(timer);
        disconnect();
      };
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect, initialize, connect, disconnect]);

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
    clearTransactionUpdates,
    clearFraudAlerts,
    clearAnalyticsUpdates,
  };
}
