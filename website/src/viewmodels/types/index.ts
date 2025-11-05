// ViewModel-specific type definitions
// These types are specific to how data is presented in the UI

export interface UserViewModel {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  role: 'admin' | 'moderator' | 'user';
  isOnline: boolean;
  lastActive: Date;
  permissions: string[];
}

export interface DashboardViewModel {
  user: UserViewModel;
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalRevenue: number;
    monthlyGrowth: number;
  };
  recentActivities: ActivityViewModel[];
  notifications: NotificationViewModel[];
}

export interface ActivityViewModel {
  id: string;
  type: 'user_login' | 'user_register' | 'payment' | 'system_update';
  title: string;
  description: string;
  timestamp: Date;
  user?: UserViewModel;
  metadata?: Record<string, any>;
}

export interface NotificationViewModel {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  actionUrl?: string;
  actionText?: string;
}

export interface FormFieldViewModel {
  name: string;
  label: string;
  value: any;
  error?: string | null;
  touched: boolean;
  required: boolean;
  disabled: boolean;
  placeholder?: string;
}

export interface FormViewModel<T = Record<string, any>> {
  fields: Record<keyof T, FormFieldViewModel>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
  submitCount: number;
}

export interface PaginationViewModel {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  pageNumbers: number[];
}

export interface TableColumnViewModel {
  key: string;
  label: string;
  sortable: boolean;
  filterable: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableViewModel<T = any> {
  columns: TableColumnViewModel[];
  data: T[];
  loading: boolean;
  pagination: PaginationViewModel;
  selectedRows: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters: Record<string, any>;
}
