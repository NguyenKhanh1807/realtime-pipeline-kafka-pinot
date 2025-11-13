/**
 * Transactions Table ViewModel Hook
 * Manages filtering, sorting, and pagination logic for transactions table
 */

import { useState, useMemo, useEffect } from 'react';
import type { TransactionHistoryRowProps } from '@/src/components/molecules';

export type SortField = 'timestamp' | 'amount' | 'score' | 'status' | 'merchant';
export type SortOrder = 'asc' | 'desc';
export type StatusFilter = 'all' | 'approved' | 'flagged' | 'blocked';
export type RiskFilter = 'all' | 'low' | 'medium' | 'high' | 'critical';

export interface TransactionsTableFilters {
  searchQuery: string;
  statusFilter: StatusFilter;
  riskFilter: RiskFilter;
  sortField: SortField;
  sortOrder: SortOrder;
}

export interface TransactionsTableViewModel {
  // Filtered and sorted transactions
  filteredAndSortedTransactions: TransactionHistoryRowProps[];
  
  // Pagination
  paginatedTransactions: TransactionHistoryRowProps[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  
  // Filters
  filters: TransactionsTableFilters;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (filter: StatusFilter) => void;
  setRiskFilter: (filter: RiskFilter) => void;
  setSortField: (field: SortField) => void;
  setSortOrder: (order: SortOrder) => void;
  clearFilters: () => void;
  
  // Pagination controls
  setCurrentPage: (page: number) => void;
  
  // Computed
  hasActiveFilters: boolean;
}

const defaultFilters: TransactionsTableFilters = {
  searchQuery: '',
  statusFilter: 'all',
  riskFilter: 'all',
  sortField: 'timestamp',
  sortOrder: 'desc',
};

export function useTransactionsTableViewModel(
  transactions: TransactionHistoryRowProps[],
  itemsPerPage: number = 5
): TransactionsTableViewModel {
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<TransactionsTableFilters>(defaultFilters);

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Apply search filter
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(tx =>
        tx.merchant.toLowerCase().includes(query) ||
        tx.cardNumber.includes(query) ||
        tx.id.toLowerCase().includes(query) ||
        tx.location?.toLowerCase().includes(query) ||
        tx.customerName?.toLowerCase().includes(query) ||
        tx.customerEmail?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filters.statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.status.toLowerCase() === filters.statusFilter);
    }

    // Apply risk filter
    if (filters.riskFilter !== 'all') {
      filtered = filtered.filter(tx => tx.riskLevel === filters.riskFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (filters.sortField) {
        case 'timestamp':
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'score':
          aValue = a.score;
          bValue = b.score;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'merchant':
          aValue = a.merchant.toLowerCase();
          bValue = b.merchant.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [transactions, filters]);

  // Calculate pagination
  const totalItems = filteredAndSortedTransactions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Get paginated transactions
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedTransactions.slice(startIndex, endIndex);
  }, [filteredAndSortedTransactions, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.searchQuery, filters.statusFilter, filters.riskFilter, filters.sortField, filters.sortOrder]);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // Filter setters
  const setSearchQuery = (query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  };

  const setStatusFilter = (statusFilter: StatusFilter) => {
    setFilters(prev => ({ ...prev, statusFilter }));
  };

  const setRiskFilter = (riskFilter: RiskFilter) => {
    setFilters(prev => ({ ...prev, riskFilter }));
  };

  const setSortField = (field: SortField) => {
    setFilters(prev => ({
      ...prev,
      sortField: field,
      sortOrder: prev.sortField === field && prev.sortOrder === 'asc' ? 'desc' : 'desc',
    }));
  };

  const setSortOrder = (order: SortOrder) => {
    setFilters(prev => ({ ...prev, sortOrder: order }));
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
  };

  // Handle sort toggle
  const handleSort = (field: SortField) => {
    if (filters.sortField === field) {
      setSortOrder(filters.sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Override setSortField to handle toggle logic
  const setSortFieldWithToggle = (field: SortField) => {
    handleSort(field);
  };

  const hasActiveFilters = filters.searchQuery || filters.statusFilter !== 'all' || filters.riskFilter !== 'all';

  return {
    filteredAndSortedTransactions,
    paginatedTransactions,
    currentPage,
    totalPages,
    totalItems,
    filters,
    setSearchQuery,
    setStatusFilter,
    setRiskFilter,
    setSortField: setSortFieldWithToggle,
    setSortOrder,
    clearFilters,
    setCurrentPage,
    hasActiveFilters,
  };
}

