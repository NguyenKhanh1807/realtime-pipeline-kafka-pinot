// Pages - Specific instances of templates with real content
// Pages are the highest level of Atomic Design

// Common pages
export { default as HomePage } from './home-page';

// Auth pages
export { default as LoginPage } from './auth/login-page';
export { default as RegisterPage } from './auth/register-page';

// Admin pages
export { default as DashboardPage } from './admin/dashboard-page';
export { default as TransactionPage } from './admin/fraud-detection-page';
export { default as ProfilePage } from './admin/profile-page';
export { default as TransactionsPage } from './admin/transactions-page';
export { default as UserManagementPage } from './admin/user-management-page';

// User pages
export { default as UserDashboardPage } from './user/dashboard-page';
export { default as UserCheckoutPage } from './user/checkout-page';
export { default as ScorePage } from './user/score-page';
