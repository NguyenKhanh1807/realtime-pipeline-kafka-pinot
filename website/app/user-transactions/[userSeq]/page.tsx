'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Typography } from '@/src/components/atoms/typography';
import { Button } from '@/src/components/atoms/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/atoms/card';
import { DashboardLayout } from '@/src/layouts/dashboard-layout';
import { cn } from '@/src/lib/utils';
import { 
  ArrowLeft, 
  User, 
  Activity, 
  DollarSign, 
  MapPin, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

export default function UserTransactionsPage() {
  const params = useParams();
  const router = useRouter();
  const userSeq = params?.userSeq as string;
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    if (!userSeq) return;

    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);
      try {
        const { pinotClient } = await import('@/src/services/pinot-client');
        const query = {
          sql: `
            SELECT transaction_seq, create_dt, deposit_amount, receiving_country, label, fraud_score
            FROM transactions
            WHERE user_seq = '${userSeq}'
            ORDER BY create_dt DESC
            LIMIT 100
          `,
        };
        const result = await pinotClient.query(query);
        setTransactions(result?.resultTable?.rows || []);
      } catch (err) {
        console.error('Failed to fetch transactions:', err);
        setError('Failed to load transactions. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [userSeq]);

  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const totalPages = Math.ceil(transactions.length / rowsPerPage);

  const getFraudScoreColor = (score: number) => {
    if (score >= 0.7) return 'text-red-600 bg-red-50 dark:bg-red-900/20';
    if (score >= 0.5) return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
    if (score >= 0.3) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
    return 'text-green-600 bg-green-50 dark:bg-green-900/20';
  };

  if (!userSeq) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <Typography variant="h3" className="text-destructive">Invalid User</Typography>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <User className="h-8 w-8 text-primary" />
                <Typography variant="h1" size="3xl" weight="bold" className="text-foreground">
                  User Transactions
                </Typography>
              </div>
              <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mt-1">
                Transaction history for User ID: <span className="font-mono font-semibold">{userSeq}</span>
              </Typography>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <Typography variant="p" size="sm" color="muted">
                  Loading transactions...
                </Typography>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="py-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <Typography variant="p" className="text-destructive">
                  {error}
                </Typography>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !error && transactions.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Activity className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <Typography variant="p" size="base" color="muted">
                No transactions found for this user.
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Transactions Table */}
        {!loading && !error && transactions.length > 0 && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Activity className="h-10 w-10 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2" />
                    <div>
                      <Typography variant="p" size="xs" color="muted" className="text-muted-foreground">
                        Total Transactions
                      </Typography>
                      <Typography variant="h3" size="2xl" weight="bold" className="text-foreground">
                        {transactions.length}
                      </Typography>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-10 w-10 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg p-2" />
                    <div>
                      <Typography variant="p" size="xs" color="muted" className="text-muted-foreground">
                        Fraud Transactions
                      </Typography>
                      <Typography variant="h3" size="2xl" weight="bold" className="text-foreground">
                        {transactions.filter(tx => tx[4] === 1).length}
                      </Typography>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-10 w-10 text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg p-2" />
                    <div>
                      <Typography variant="p" size="xs" color="muted" className="text-muted-foreground">
                        Total Amount
                      </Typography>
                      <Typography variant="h3" size="2xl" weight="bold" className="text-foreground">
                        ${transactions.reduce((sum, tx) => sum + (tx[2] || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </Typography>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-10 w-10 text-orange-600 bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2" />
                    <div>
                      <Typography variant="p" size="xs" color="muted" className="text-muted-foreground">
                        Avg Fraud Score
                      </Typography>
                      <Typography variant="h3" size="2xl" weight="bold" className="text-foreground">
                        {(transactions.reduce((sum, tx) => sum + (tx[5] || 0), 0) / transactions.length * 100).toFixed(0)}%
                      </Typography>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Transactions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Transaction History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Transaction ID
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Country
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Fraud Score
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paginatedTransactions.map((tx, idx) => (
                        <tr 
                          key={tx[0] || idx} 
                          className="hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-4 py-4">
                            <Typography variant="span" className="font-mono text-sm">
                              {tx[0]}
                            </Typography>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <Typography variant="span" size="sm">
                                {new Date(tx[1]).toLocaleString()}
                              </Typography>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <Typography variant="span" size="sm" weight="semibold">
                                {tx[2]?.toLocaleString()}
                              </Typography>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <Typography variant="span" size="sm">
                                {tx[3]}
                              </Typography>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            {tx[4] === 1 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                <XCircle className="h-3 w-3" />
                                Fraud
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                <CheckCircle className="h-3 w-3" />
                                Legit
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center">
                              <span className={cn(
                                'inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold',
                                getFraudScoreColor(tx[5] || 0)
                              )}>
                                {(tx[5] * 100).toFixed(0)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
                    <Typography variant="span" size="sm" color="muted">
                      Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, transactions.length)} of {transactions.length} transactions
                    </Typography>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Typography variant="span" size="sm" className="px-3">
                        Page {currentPage} of {totalPages}
                      </Typography>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
