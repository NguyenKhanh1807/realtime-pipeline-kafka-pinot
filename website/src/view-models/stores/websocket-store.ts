/**
 * WebSocket Store
 * Manages WebSocket connection state and real-time data
 * Uses Model layer (services) for WebSocket client
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { webSocketRepository } from '@/src/models/repositories';
import type { TransactionUpdate, FraudAlert, AnalyticsUpdate, WebSocketEventType, WebSocketEvent } from '@/src/services/websocket-client';

export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  error?: string;
}

export interface WebSocketState {
  connectionStatus: ConnectionStatus;
  transactionUpdates: TransactionUpdate[];
  fraudAlerts: FraudAlert[];
  analyticsUpdates: AnalyticsUpdate[];
}

export interface WebSocketActions {
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribe: (eventType: WebSocketEventType, callback: (event: WebSocketEvent) => void) => void;
  unsubscribe: (eventType: WebSocketEventType, callback: (event: WebSocketEvent) => void) => void;
  clearTransactionUpdates: () => void;
  clearFraudAlerts: () => void;
  clearAnalyticsUpdates: () => void;
  initialize: () => void;
}

export type WebSocketStore = WebSocketState & WebSocketActions;

const initialState: WebSocketState = {
  connectionStatus: {
    connected: false,
    reconnecting: false,
  },
  transactionUpdates: [],
  fraudAlerts: [],
  analyticsUpdates: [],
};

export const useWebSocketStore = create<WebSocketStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      initialize: () => {
        // Set up connection status listener
        webSocketRepository.on('connection_status', (event) => {
          const { connected, error } = event.data as { connected: boolean; error?: string };
          set({
            connectionStatus: {
              connected,
              reconnecting: !connected && !error,
              error,
            },
          });
        });

        // Set up transaction update listener
        webSocketRepository.onTransactionUpdate((update) => {
          set((state) => ({
            transactionUpdates: [update, ...state.transactionUpdates.slice(0, 49)], // Keep last 50
          }));
        });

        // Set up fraud alert listener
        webSocketRepository.onFraudAlert((alert) => {
          set((state) => ({
            fraudAlerts: [alert, ...state.fraudAlerts.slice(0, 19)], // Keep last 20
          }));
        });

        // Set up analytics update listener
        webSocketRepository.onAnalyticsUpdate((update) => {
          set((state) => ({
            analyticsUpdates: [update, ...state.analyticsUpdates.slice(0, 9)], // Keep last 10
          }));
        });
      },

      connect: async () => {
        // Initialize listeners if not already done
        get().initialize();

        try {
          set((state) => ({
            connectionStatus: { ...state.connectionStatus, reconnecting: true },
          }));

          await webSocketRepository.connect();

          // Subscribe to data streams
          webSocketRepository.subscribeToAlerts();
          webSocketRepository.subscribeToTransactions();
          webSocketRepository.subscribeToAnalytics();

          set({
            connectionStatus: {
              connected: true,
              reconnecting: false,
            },
          });
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('WebSocket connection failed - server not available');
          }
          set({
            connectionStatus: {
              connected: false,
              reconnecting: false,
              error: 'Server not available',
            },
          });
        }
      },

      disconnect: () => {
        webSocketRepository.disconnect();
        set({
          connectionStatus: {
            connected: false,
            reconnecting: false,
          },
        });
      },

      subscribe: (eventType: WebSocketEventType, callback: (event: WebSocketEvent) => void) => {
        webSocketRepository.on(eventType, callback);
      },

      unsubscribe: (eventType: WebSocketEventType, callback: (event: WebSocketEvent) => void) => {
        webSocketRepository.off(eventType, callback);
      },

      clearTransactionUpdates: () => set({ transactionUpdates: [] }),
      clearFraudAlerts: () => set({ fraudAlerts: [] }),
      clearAnalyticsUpdates: () => set({ analyticsUpdates: [] }),
    }),
    {
      name: 'websocket-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// Selectors for optimized re-renders
export const useWebSocketConnectionStatus = () => useWebSocketStore((state) => state.connectionStatus);
export const useTransactionUpdates = () => useWebSocketStore((state) => state.transactionUpdates);
export const useFraudAlerts = () => useWebSocketStore((state) => state.fraudAlerts);
export const useAnalyticsUpdates = () => useWebSocketStore((state) => state.analyticsUpdates);
export const useIsWebSocketConnected = () => useWebSocketStore((state) => state.connectionStatus.connected);

