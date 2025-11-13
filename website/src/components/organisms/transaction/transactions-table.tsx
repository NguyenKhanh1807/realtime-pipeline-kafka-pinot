'use client';

import { useState } from 'react';
import { Typography, Button, Input } from '@/src/components/atoms';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/atoms/forms/select';
import { TransactionHistoryRow, type TransactionHistoryRowProps, Pagination } from '@/src/components/molecules';
import { cn } from '@/src/lib';
import { Search, Filter, ArrowUpDown, X } from 'lucide-react';
import { useTransactionsTableViewModel, type StatusFilter, type RiskFilter, type SortField } from '@/src/view-models';

export interface TransactionsTableProps {
  transactions: TransactionHistoryRowProps[];
  title?: string;
  description?: string;
  itemsPerPage?: number;
  className?: string;
}

export function TransactionsTable({
  transactions,
  title = 'Transaction History',
  description = 'Complete transaction log with fraud scores and status',
  itemsPerPage = 5,
  className,
}: TransactionsTableProps) {
  const [showFilters, setShowFilters] = useState(false);

  // Use ViewModel for filtering, sorting, and pagination logic
  const {
    paginatedTransactions,
    currentPage,
    totalPages,
    totalItems,
    filters,
    setSearchQuery,
    setStatusFilter,
    setRiskFilter,
    setSortField,
    setCurrentPage,
    clearFilters,
    hasActiveFilters,
  } = useTransactionsTableViewModel(transactions, itemsPerPage);

  return (
    <div className={cn('bg-card border border-border rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-border space-y-5">
        <div className={cn('flex items-center justify-between', hasActiveFilters ? 'mb-5' : '')}>
          <div>
            <Typography variant="h2" size="lg" weight="semibold" className="text-foreground">
              {title}
            </Typography>
            <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mt-1">
              {description}
            </Typography>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-9"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-xs font-medium">
                {[filters.searchQuery, filters.statusFilter !== 'all', filters.riskFilter !== 'all'].filter(Boolean).length}
              </span>
            )}
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="pt-5 pb-1 border-t border-border">
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[250px] relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search transactions..."
                  value={filters.searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>

              <div className="w-[180px]">
                <Select value={filters.statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[160px]">
                <Select value={filters.riskFilter} onValueChange={(value) => setRiskFilter(value as RiskFilter)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Risk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risk</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="h-9"
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left p-4">
                <button
                  onClick={() => setSortField('timestamp')}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <Typography variant="span" size="sm" weight="medium" className="text-muted-foreground uppercase tracking-wider pb-1">
                    Time & ID
                  </Typography>
                  <ArrowUpDown className={cn(
                    "h-3.5 w-3.5 text-muted-foreground",
                    filters.sortField === 'timestamp' && 'text-primary'
                  )} />
                </button>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => setSortField('amount')}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <Typography variant="span" size="sm" weight="medium" className="text-muted-foreground uppercase tracking-wider pb-1">
                    Amount & Card
                  </Typography>
                  <ArrowUpDown className={cn(
                    "h-3.5 w-3.5 text-muted-foreground",
                    filters.sortField === 'amount' && 'text-primary'
                  )} />
                </button>
              </th>
              <th className="text-left p-4">
                <button
                  onClick={() => setSortField('merchant')}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <Typography variant="span" size="sm" weight="medium" className="text-muted-foreground uppercase tracking-wider pb-1">
                    Merchant & Location
                  </Typography>
                  <ArrowUpDown className={cn(
                    "h-3.5 w-3.5 text-muted-foreground",
                    filters.sortField === 'merchant' && 'text-primary'
                  )} />
                </button>
              </th>
              <th className="text-left p-4 w-50">
                <button
                  onClick={() => setSortField('score')}
                  className="flex items-center justify-start gap-2 hover:text-primary transition-colors"
                >
                  <Typography variant="span" size="sm" weight="medium" className="text-muted-foreground uppercase tracking-wider pb-1">
                    Risk Score
                  </Typography>
                  <ArrowUpDown className={cn(
                    "h-3.5 w-3.5 text-muted-foreground",
                    filters.sortField === 'score' && 'text-primary'
                  )} />
                </button>
              </th>
              <th className="text-left p-4 w-50">
                <button
                  onClick={() => setSortField('status')}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <Typography variant="span" size="sm" weight="medium" className="text-muted-foreground uppercase tracking-wider pb-1">
                    Status
                  </Typography>
                  <ArrowUpDown className={cn(
                    "h-3.5 w-3.5 text-muted-foreground",
                    filters.sortField === 'status' && 'text-primary'
                  )} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedTransactions.length > 0 ? (
              paginatedTransactions.map((transaction) => (
                <TransactionHistoryRow key={transaction.id} {...transaction} />
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-10 w-10 text-muted-foreground/30" />
                    <Typography variant="span" size="sm" color="muted" className="text-muted-foreground">
                      {hasActiveFilters ? 'No transactions match your filters' : 'No transactions found'}
                    </Typography>
                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilters}
                        className="mt-2 h-8"
                      >
                        <X className="h-3.5 w-3.5 mr-1.5" />
                        Clear Filters
                      </Button>
                    )}
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

