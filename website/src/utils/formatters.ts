import { getInitials } from './helpers';

/**
 * Format currency values
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format numbers with thousand separators
 */
export function formatNumber(
  num: number,
  options?: {
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const { locale = 'en-US', minimumFractionDigits, maximumFractionDigits } = options || {};

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(num);
}

/**
 * Format file sizes in human-readable format
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${formatNumber(size, { maximumFractionDigits: 1 })} ${units[unitIndex]}`;
}

/**
 * Format phone numbers
 */
export function formatPhoneNumber(phone: string, country: string = 'US'): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // US phone number formatting
  if (country === 'US' && cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  // International formatting (basic)
  if (country === 'US' && cleaned.length === 11 && cleaned.startsWith('1')) {
    const number = cleaned.slice(1);
    return `+1 (${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
  }

  // Return as-is for other formats
  return phone;
}

/**
 * Format user names with proper capitalization
 */
export function formatUserName(firstName?: string, lastName?: string, fallback?: string): string {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  if (firstName) return firstName;
  if (lastName) return lastName;
  return fallback || 'Anonymous User';
}

/**
 * Format user display name with initials fallback
 */
export function formatDisplayName(name?: string, email?: string): string {
  if (name && name.trim()) return name.trim();
  if (email) return email.split('@')[0];
  return 'Anonymous';
}

/**
 * Format user avatar text (initials)
 */
export function formatAvatarText(name?: string, email?: string): string {
  const displayName = formatDisplayName(name, email);
  return getInitials(displayName);
}

/**
 * Format percentage values
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${formatNumber(value, { maximumFractionDigits: decimals })}%`;
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const parts: string[] = [];

  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSeconds > 0 || parts.length === 0) parts.push(`${remainingSeconds}s`);

  return parts.join(' ');
}

/**
 * Format a list with proper grammar
 */
export function formatList(items: string[], conjunction: string = 'and'): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;

  const allButLast = items.slice(0, -1).join(', ');
  const last = items[items.length - 1];

  return `${allButLast}, ${conjunction} ${last}`;
}

/**
 * Format a slug from text
 */
export function formatSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Format a title case string
 */
export function formatTitleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format ordinal numbers (1st, 2nd, 3rd, etc.)
 */
export function formatOrdinal(num: number): string {
  const j = num % 10;
  const k = num % 100;

  if (j === 1 && k !== 11) return `${num}st`;
  if (j === 2 && k !== 12) return `${num}nd`;
  if (j === 3 && k !== 13) return `${num}rd`;

  return `${num}th`;
}

/**
 * Format a compact number (1.2K, 1.5M, etc.)
 */
export function formatCompactNumber(num: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num);
}

/**
 * Format a JSON object for display
 */
export function formatJSON(obj: any, indent: number = 2): string {
  return JSON.stringify(obj, null, indent);
}

/**
 * Format error messages for user display
 */
export function formatErrorMessage(error: any): string {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error?.message) return error.error.message;
  return 'An unexpected error occurred';
}
