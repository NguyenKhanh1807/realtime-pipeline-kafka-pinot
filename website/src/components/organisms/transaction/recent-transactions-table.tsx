'use client';

import { useState, useMemo, useEffect } from 'react';
import { Typography, Button } from '@/src/components/atoms';
import { TransactionTableRow, TransactionTableRowProps, Pagination } from '@/src/components/molecules';
import { cn } from '@/src/lib';
import { Search, ArrowUpDown } from 'lucide-react';

export interface RecentTransactionsTableProps {
  transactions: TransactionTableRowProps[];
  title?: string;
  itemsPerPage?: number;
  className?: string;
}

type SortField = 'time' | 'amount' | 'score' | 'status' | 'merchant';
type SortOrder = 'asc' | 'desc';

export function RecentTransactionsTable({
  transactions,
  title = 'Recent Transactions',
  itemsPerPage = 5,
  className,
}: RecentTransactionsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('time');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    const sorted = [...transactions];

    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'time':
          // Parse time string - handle formats like "2 min ago", "Jan 1, 2024, 10:30 AM", etc.
          try {
            aValue = new Date(a.time).getTime();
            bValue = new Date(b.time).getTime();
            // If parsing fails, use 0 as fallback
            if (isNaN(aValue)) aValue = 0;
            if (isNaN(bValue)) bValue = 0;
          } catch {
            aValue = 0;
            bValue = 0;
          }
          break;
        case 'amount':
          // Extract numeric value from amount string (e.g., "$1,234.56" -> 1234.56)
          aValue = parseFloat(a.amount.replace(/[^0-9.-]/g, '')) || 0;
          bValue = parseFloat(b.amount.replace(/[^0-9.-]/g, '')) || 0;
          break;
        case 'score':
          aValue = a.score;
          bValue = b.score;
          break;
        case 'status':
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        case 'merchant':
          aValue = a.merchant.toLowerCase();
          bValue = b.merchant.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [transactions, sortField, sortOrder]);

  // Calculate pagination
  const totalItems = sortedTransactions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Get current page items
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedTransactions.slice(startIndex, endIndex);
  }, [sortedTransactions, currentPage, itemsPerPage]);

  // Reset to page 1 when sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [sortField, sortOrder]);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };
  return (
    <div className={cn('bg-card border border-border rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <Typography variant="h2" size="lg" weight="semibold" className="text-foreground">
              {title}
            </Typography>
            <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mt-1">
              Latest transaction activity and fraud detection results
            </Typography>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('time')}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <Typography variant="span" size="sm" weight="medium" className="text-muted-foreground uppercase tracking-wider pb-1">
                    Time & ID
                  </Typography>
                  <ArrowUpDown className={cn(
                    "h-3.5 w-3.5 text-muted-foreground",
                    sortField === 'time' && 'text-primary'
                  )} />
                </button>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('amount')}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <Typography variant="span" size="sm" weight="medium" className="text-muted-foreground uppercase tracking-wider pb-1">
                    Amount & Card
                  </Typography>
                  <ArrowUpDown className={cn(
                    "h-3.5 w-3.5 text-muted-foreground",
                    sortField === 'amount' && 'text-primary'
                  )} />
                </button>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => handleSort('merchant')}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <Typography variant="span" size="sm" weight="medium" className="text-muted-foreground uppercase tracking-wider pb-1">
                    Merchant & Location
                  </Typography>
                  <ArrowUpDown className={cn(
                    "h-3.5 w-3.5 text-muted-foreground",
                    sortField === 'merchant' && 'text-primary'
                  )} />
                </button>
              </th>
              <th className="text-left p-4 w-50">
                <button
                  onClick={() => handleSort('score')}
                  className="flex items-center justify-start gap-2 hover:text-primary transition-colors"
                >
                  <Typography variant="span" size="sm" weight="medium" className="text-muted-foreground uppercase tracking-wider pb-1">
                    Risk Analysis
                  </Typography>
                  <ArrowUpDown className={cn(
                    "h-3.5 w-3.5 text-muted-foreground",
                    sortField === 'score' && 'text-primary'
                  )} />
                </button>
              </th>
              <th className="text-left p-4 w-50">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <Typography variant="span" size="sm" weight="medium" className="text-muted-foreground uppercase tracking-wider pb-1">
                    Status
                  </Typography>
                  <ArrowUpDown className={cn(
                    "h-3.5 w-3.5 text-muted-foreground",
                    sortField === 'status' && 'text-primary'
                  )} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedTransactions.length > 0 ? (
              paginatedTransactions.map((transaction, index) => (
                <TransactionTableRow key={index} {...transaction} showCustomerInfo={false} />
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-10 w-10 text-muted-foreground/30" />
                    <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
                      No transactions found
                    </Typography>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}

