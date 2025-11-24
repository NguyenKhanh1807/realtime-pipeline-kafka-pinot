// Export all stores from a central location
export { useAppStore, useUser, useIsAuthenticated, useIsLoading, useError, useSidebarOpen, useCurrentPage } from './app-store';
export { useThemeStore, useThemeMode, useResolvedTheme, useColorScheme, useBorderRadius, useThemeClass, useSystemPreference } from './theme-store';
export { 
  useDashboardStore, 
  useDashboardAnalytics, 
  useDashboardLoading, 
  useDashboardError 
} from './dashboard-store';
export { 
  useWebSocketStore,
  useWebSocketConnectionStatus,
  useTransactionUpdates,
  useFraudAlerts,
  useAnalyticsUpdates,
  useIsWebSocketConnected
} from './websocket-store';

// Re-export types
export type { User, AppState, AppActions, AppStore } from './app-store';
export type { ThemeMode, ColorScheme, ThemeState, ThemeActions, ThemeStore } from './theme-store';
export type { DashboardAnalytics, DashboardState, DashboardActions, DashboardStore } from './dashboard-store';
export type { ConnectionStatus, WebSocketState, WebSocketActions, WebSocketStore } from './websocket-store';
export { useUserManagementStore } from './user-management-store';
export type { UserManagementState, UserManagementActions, UserManagementStore } from './user-management-store';
export {
  useRealtimeTransactionsStore,
  useRealtimeTransactions,
  useRealtimeTransactionUpdates,
  useIsPollingTransactions,
  useTransactionsError,
} from './realtime-transactions-store';
export type { RealtimeTransactionsState, RealtimeTransactionsActions, RealtimeTransactionsStore } from './realtime-transactions-store';
