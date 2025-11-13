'use client';

import { useState, useMemo, useEffect } from 'react';
import { Typography } from '@/src/components/atoms';
import { TransactionTableRow, TransactionTableRowProps, Pagination } from '@/src/components/molecules';
import { cn } from '@/src/lib';

export interface RecentTransactionsTableProps {
  transactions: TransactionTableRowProps[];
  title?: string;
  itemsPerPage?: number;
  className?: string;
}

export function RecentTransactionsTable({
  transactions,
  title = 'Recent Transactions',
  itemsPerPage = 10,
  className,
}: RecentTransactionsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate pagination
  const totalItems = transactions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Get current page items
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return transactions.slice(startIndex, endIndex);
  }, [transactions, currentPage, itemsPerPage]);

  // Reset to page 1 if current page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);
  return (
    <div className={cn('bg-card border border-border rounded-xl shadow-sm', className)}>
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <Typography variant="h2" size="xl" weight="semibold" className="text-foreground">
                {title}
              </Typography>
              <Typography variant="p" size="base" color="muted" className="text-muted-foreground mt-0.5">
                Latest transaction activity and fraud detection results
              </Typography>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left p-4">
                <Typography variant="span" size="sm" weight="semibold" className="text-muted-foreground uppercase tracking-wider">
                  Time & ID
                </Typography>
              </th>
              <th className="text-left p-4">
                <Typography variant="span" size="sm" weight="semibold" className="text-muted-foreground uppercase tracking-wider">
                  Amount & Card
                </Typography>
              </th>
              <th className="text-left p-4">
                <Typography variant="span" size="sm" weight="semibold" className="text-muted-foreground uppercase tracking-wider">
                  Merchant & Location
                </Typography>
              </th>
              <th className="text-left p-4 w-40">
                <Typography variant="span" size="sm" weight="semibold" className="text-muted-foreground uppercase tracking-wider">
                  Risk Analysis
                </Typography>
              </th>
              <th className="text-left p-4 w-40">
                <Typography variant="span" size="sm" weight="semibold" className="text-muted-foreground uppercase tracking-wider">
                  Status
                </Typography>
              </th>
              <th className="text-left p-4">
                <Typography variant="span" size="sm" weight="semibold" className="text-muted-foreground uppercase tracking-wider">
                  Customer Info
                </Typography>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {paginatedTransactions.length > 0 ? (
              paginatedTransactions.map((transaction, index) => (
                <TransactionTableRow key={index} {...transaction} />
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center">
                  <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
                    No transactions found
                  </Typography>
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

