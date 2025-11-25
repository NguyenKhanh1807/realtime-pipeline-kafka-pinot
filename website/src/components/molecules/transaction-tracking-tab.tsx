'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Typography } from '@/src/components/atoms/typography';
import { Button } from '@/src/components/atoms/button';
import { cn } from '@/src/lib/utils';
import {
  User,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Ban,
  Shield,
  RefreshCw,
  Filter,
  Search,
} from 'lucide-react';

interface UserTransaction {
  userSeq: string;
  userName: string;
  country: string;
  totalTransactions: number;
  fraudTransactions: number;
  fraudRate: number;
  maxFraudScore: number;
  lastTransactionTime: number;
  status: 'active' | 'warning' | 'banned';
  banReason?: string;
}

interface BanRecord {
  user_seq: string | number;
  ban_level: 'banned' | 'high_risk' | 'warning';
  reason: string;
  is_active: boolean;
  banned_at: string;
}

interface TransactionTrackingTabProps {
  producerActive: boolean;
  className?: string;
}

export function TransactionTrackingTab({
  producerActive,
  className,
}: TransactionTrackingTabProps) {
  const router = useRouter();
  const [users, setUsers] = useState<UserTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'warning' | 'banned'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'fraudRate' | 'transactions' | 'lastActivity'>('fraudRate');
  const [banningUser, setBanningUser] = useState<string | null>(null);

  // Modal state for user transaction history
  const [selectedUserSeq, setSelectedUserSeq] = useState<string | null>(null);
  const [userTransactions, setUserTransactions] = useState<any[]>([]);
  const [loadingUserTx, setLoadingUserTx] = useState(false);
  const [errorUserTx, setErrorUserTx] = useState<string | null>(null);

  // Fetch all transactions for selected user
  const loadUserTransactions = async (userSeq: string) => {
    setLoadingUserTx(true);
    setErrorUserTx(null);
    setUserTransactions([]);
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
      setUserTransactions(result?.resultTable?.rows || []);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      setErrorUserTx('Failed to load transactions. Please try again.');
    } finally {
      setLoadingUserTx(false);
    }
  };

  // Open modal and load transactions
  const handleUserIdClick = (userSeq: string) => {
    router.push(`/user-transactions/${userSeq}`);
  };

  // Close modal
  const handleCloseModal = () => {
    setSelectedUserSeq(null);
    setUserTransactions([]);
  };

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const { pinotClient } = await import('@/src/services/pinot-client');
      
      // Get user transaction statistics
      const query = {
        sql: `
          SELECT 
            user_seq,
            user_name,
            country_code,
            COUNT(*) as total_transactions,
            SUM(CASE WHEN label = 1 THEN 1 ELSE 0 END) as fraud_transactions,
            MAX(fraud_score) as max_fraud_score,
            MAX(create_dt) as last_transaction_time
          FROM transactions
          GROUP BY user_seq, user_name, country_code
          HAVING COUNT(*) >= 3
          ORDER BY MAX(fraud_score) DESC
          LIMIT 100
        `,
      };

      const result = await pinotClient.query(query);
      
      if (!result || !result.resultTable.rows) {
        setUsers([]);
        return;
      }

      // Get ban status for users
      const bansRes = await fetch('/api/user/bans', { cache: 'no-store' });
      
              // eslint-disable-next-line no-console
              console.log('[TrackingTab] Pinot result rows:', result?.resultTable?.rows?.length, result?.resultTable?.rows);
      const bans: BanRecord[] = bansRes.ok ? await bansRes.json() : [];
      // Only include active bans in the map
      const banMap = new Map<string, BanRecord>(
        bans.filter(b => b.is_active).map((b) => [String(b.user_seq), b]));
      
      // Create a Set of user_seqs from query results
      const queriedUserSeqs = new Set<string>();

      const userData: UserTransaction[] = result.resultTable.rows.map((row: any[]) => {
        const userSeq = String(row[0] || '');
        queriedUserSeqs.add(userSeq);
        
        const userName = String(row[1] || 'Unknown User');
        const country = String(row[2] || 'Unknown');
        const totalTransactions = typeof row[3] === 'number' ? row[3] : 0;
        const fraudTransactions = typeof row[4] === 'number' ? row[4] : 0;
        const maxFraudScore = typeof row[5] === 'number' ? row[5] : 0;
        const lastTransactionTime = typeof row[6] === 'number' ? row[6] : Date.now();
        const fraudRate = totalTransactions > 0 ? (fraudTransactions / totalTransactions) * 100 : 0;

        const ban = banMap.get(userSeq);
        let status: 'active' | 'warning' | 'banned' = 'active';
        
        // Check if user has active ban with specific level
        if (ban && ban.ban_level === 'banned') {
          status = 'banned';
        } else if (maxFraudScore > 0) {
          // DEBUG: Force all users with any fraud score to warning
          status = 'warning';
        }

        // eslint-disable-next-line no-console
        console.log(`[UserStatus] userSeq=${userSeq}, ban=${ban ? ban.ban_level : 'none'}, maxFraudScore=${maxFraudScore}, fraudRate=${fraudRate}, status=${status}`);

        return {
          userSeq,
          userName,
          country,
          totalTransactions,
          fraudTransactions,
          fraudRate,
          maxFraudScore,
          lastTransactionTime,
          status,
          banReason: ban?.reason,
        };
      });

      // Add banned users who don't appear in query results (e.g., have < 3 transactions)
      for (const ban of bans) {
        if (ban.is_active && !queriedUserSeqs.has(String(ban.user_seq))) {
          let status: 'active' | 'warning' | 'banned' = 'active';
          if (ban.ban_level === 'banned') {
            status = 'banned';
          } else if (ban.ban_level === 'high_risk' || ban.ban_level === 'warning') {
            status = 'warning';
          }
          
          userData.push({
            userSeq: String(ban.user_seq),
            userName: 'Unknown User',
            country: 'Unknown',
            totalTransactions: 0,
            fraudTransactions: 0,
            fraudRate: 0,
            maxFraudScore: 0,
            lastTransactionTime: new Date(ban.banned_at).getTime(),
            status,
            banReason: ban.reason,
          });
        }
      }

      setUsers(userData);
    } catch (error) {
      console.error('Failed to load user data:', error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
    const interval = setInterval(loadUserData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      const warningCount = users.filter(u => u.status === 'warning').length;
      const bannedCount = users.filter(u => u.status === 'banned').length;
      const activeCount = users.filter(u => u.status === 'active').length;
      // eslint-disable-next-line no-console
      console.log(`[TrackingTab] Users loaded: ${users.length}, warning: ${warningCount}, banned: ${bannedCount}, active: ${activeCount}`);
    }
  }, [users]);

  const handleBanUser = async (userSeq: string, maxFraudScore: number) => {
    if (!confirm(`Ban user ${userSeq}? This will prevent all future transactions.`)) {
      return;
    }

    try {
      setBanningUser(userSeq);
      const response = await fetch('/api/user/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_seq: userSeq,
          ban_level: 'banned',
          reason: `Critical fraud detected: max fraud score ${(maxFraudScore * 100).toFixed(1)}%`,
        }),
      });

      if (response.ok) {
        await loadUserData();
        alert(`User ${userSeq} has been banned successfully.`);
      } else {
        const error = await response.json();
        alert(`Failed to ban user: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to ban user:', error);
      alert('Failed to ban user. Please try again.');
    } finally {
      setBanningUser(null);
    }
  };

  const handleUnbanUser = async (userSeq: string) => {
    if (!confirm(`Unban user ${userSeq}?`)) {
      return;
    }

    try {
      setBanningUser(userSeq);
      const response = await fetch('/api/user/unban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_seq: userSeq }),
      });

      if (response.ok) {
        await loadUserData();
        alert(`User ${userSeq} has been unbanned successfully.`);
      } else {
        const error = await response.json();
        alert(`Failed to unban user: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to unban user:', error);
      alert('Failed to unban user. Please try again.');
    } finally {
      setBanningUser(null);
    }
  };

  // Filter and sort users
  const filteredUsers = users
    .filter((user) => {
      if (filterStatus !== 'all' && user.status !== filterStatus) return false;
      if (searchTerm && !user.userSeq.includes(searchTerm) && !user.userName.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'fraudRate') return b.fraudRate - a.fraudRate;
      if (sortBy === 'transactions') return b.totalTransactions - a.totalTransactions;
      if (sortBy === 'lastActivity') return b.lastTransactionTime - a.lastTransactionTime;
      return 0;
    });

  // Added pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Updated the user transaction tracking table to support pagination
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'banned':
        return 'text-red-600 bg-red-50 dark:bg-red-200';
      case 'warning':
        return 'text-orange-600 bg-orange-50 dark:bg-orange-200';
      default:
        return 'text-green-600 bg-green-50 dark:bg-green-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'banned':
        return <XCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <Typography variant="h3" size="lg" weight="semibold" className="text-foreground">
              User Transaction Tracking
            </Typography>
            <Typography variant="p" size="sm" color="muted" className="text-muted-foreground mt-1">
              Monitor users with suspicious activity and manage bans
            </Typography>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadUserData}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">

            {/* User Transaction History Modal */}
            {selectedUserSeq && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-card border border-border rounded-lg p-8 w-full max-w-2xl shadow-lg relative">
                  <button
                    className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                    onClick={handleCloseModal}
                    title="Close"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                  <Typography variant="h3" size="lg" weight="semibold" className="mb-4">
                    Transactions for User {selectedUserSeq}
                  </Typography>
                  {loadingUserTx ? (
                    <div className="text-center py-8">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                      <Typography variant="p" size="sm" color="muted">Loading transactions...</Typography>
                    </div>
                  ) : userTransactions.length === 0 ? (
                    <Typography variant="p" size="sm" color="muted">No transactions found for this user.</Typography>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="px-2 py-2 text-left">Txn ID</th>
                          <th className="px-2 py-2 text-left">Time</th>
                          <th className="px-2 py-2 text-left">Amount</th>
                          <th className="px-2 py-2 text-left">Country</th>
                          <th className="px-2 py-2 text-left">Label</th>
                          <th className="px-2 py-2 text-left">Fraud Score</th>
                        </tr>
                      </thead>
                      {/* Updated the transaction table to limit the display to 10 rows */}
                      <tbody>
                        {userTransactions.slice(0, 10).map((tx, idx) => (
                          <tr key={tx[0] || idx} className="border-b border-border">
                            <td className="px-2 py-2 font-mono">{tx[0]}</td>
                            <td className="px-2 py-2">{new Date(tx[1]).toLocaleString()}</td>
                            <td className="px-2 py-2">${tx[2]?.toLocaleString()}</td>
                            <td className="px-2 py-2">{tx[3]}</td>
                            <td className="px-2 py-2">{tx[4] === 1 ? 'Fraud' : 'Legit'}</td>
                            <td className="px-2 py-2">{(tx[5] * 100).toFixed(0)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by user ID or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border border-border rounded-lg bg-background text-foreground"
            >
              <option value="all">All Status</option>
              <option value="warning">Warning</option>
              <option value="banned">Banned</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-border rounded-lg bg-background text-foreground"
            >
              <option value="fraudRate">Sort by Fraud Rate</option>
              <option value="transactions">Sort by Transactions</option>
              <option value="lastActivity">Sort by Last Activity</option>
            </select>
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Region
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Transactions
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Fraud Rate
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Max Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="ml-3 text-muted-foreground">Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No users found matching your criteria
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user.userSeq} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <Typography variant="span" size="sm" weight="medium" className="text-foreground">
                            {user.userName}
                          </Typography>
                          <Typography variant="span" size="xs" color="muted" className="text-muted-foreground block">
                            ID: <button
                              type="button"
                              className="underline text-primary hover:text-primary/80 cursor-pointer px-1"
                              onClick={() => handleUserIdClick(user.userSeq)}
                              title={`View all transactions for ${user.userSeq}`}
                            >
                              {user.userSeq}
                            </button>
                          </Typography>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <Typography variant="span" size="sm" className="text-foreground">
                          {user.country}
                        </Typography>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <Typography variant="span" size="sm" weight="medium" className="text-foreground">
                          {user.totalTransactions}
                        </Typography>
                        {user.fraudTransactions > 0 && (
                          <Typography variant="span" size="xs" color="muted" className="text-red-600 block">
                            {user.fraudTransactions} fraud
                          </Typography>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-muted rounded-full h-2">
                          <div
                            className={cn(
                              'h-2 rounded-full',
                              user.fraudRate > 50 ? 'bg-red-500' :
                              user.fraudRate > 20 ? 'bg-orange-500' :
                              user.fraudRate > 5 ? 'bg-yellow-500' : 'bg-green-500'
                            )}
                            style={{ width: `${Math.min(user.fraudRate, 100)}%` }}
                          />
                        </div>
                        <Typography variant="span" size="sm" weight="medium" className="text-foreground">
                          {user.fraudRate.toFixed(1)}%
                        </Typography>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Typography
                        variant="span"
                        size="sm"
                        weight="medium"
                        className={cn(
                          user.maxFraudScore >= 0.8 ? 'text-red-600' :
                          user.maxFraudScore >= 0.5 ? 'text-orange-600' :
                          user.maxFraudScore >= 0.3 ? 'text-yellow-600' : 'text-green-600'
                        )}
                      >
                        {(user.maxFraudScore * 100).toFixed(1)}%
                      </Typography>
                    </td>
                    <td className="px-4 py-4">
                      <div className={cn('inline-flex items-center space-x-1 px-2 py-1 rounded-full', getStatusColor(user.status))}>
                        {getStatusIcon(user.status)}
                        <Typography variant="span" size="xs" weight="medium" className="capitalize">
                          {user.status}
                        </Typography>
                      </div>
                      {user.banReason && (
                        <Typography variant="span" size="xs" color="muted" className="text-muted-foreground block mt-1">
                          {user.banReason}
                        </Typography>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Typography variant="span" size="xs" color="muted" className="text-muted-foreground">
                        {new Date(user.lastTransactionTime).toLocaleString()}
                      </Typography>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-2">
                        {user.status === 'banned' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnbanUser(user.userSeq)}
                            disabled={banningUser === user.userSeq}
                          >
                            <Shield className="h-3 w-3 mr-1" />
                            Unban
                          </Button>
                        ) : (
                          <Button
                            variant={user.maxFraudScore >= 0.8 ? 'destructive' : 'outline'}
                            size="sm"
                            onClick={() => handleBanUser(user.userSeq, user.maxFraudScore)}
                            disabled={banningUser === user.userSeq}
                          >
                            <Ban className="h-3 w-3 mr-1" />
                            {user.maxFraudScore >= 0.8 ? 'Ban Now' : 'Ban'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Added pagination controls for the user transaction tracking table */}
        <div className="flex justify-between items-center p-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Typography variant="span" size="sm">
            Page {currentPage} of {Math.ceil(filteredUsers.length / rowsPerPage)}
          </Typography>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.ceil(filteredUsers.length / rowsPerPage)))}
            disabled={currentPage === Math.ceil(filteredUsers.length / rowsPerPage)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
