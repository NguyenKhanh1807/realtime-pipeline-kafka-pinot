'use client';

import { DashboardTemplate } from '@/src/components/templates';
import { TransactionsTable, RealtimeTransactionFeed } from '@/src/components/organisms';
import { useRealtimeTransactions } from '@/src/hooks/use-realtime-transactions';
import { Loading } from '@/src/components/atoms';

export default function TransactionsPage() {
  const {
    allTransactions,
    isPolling,
  } = useRealtimeTransactions({
    autoStart: true,
    pollInterval: 3000, // Poll every 3 seconds
  });

  if (allTransactions.length === 0 && !isPolling) {
    return (
      <DashboardTemplate>
        <div className="flex items-center justify-center h-64">
          <Loading />
        </div>
      </DashboardTemplate>
    );
  }

  return (
    <DashboardTemplate>
      <div className="space-y-6">
        {/* Live Transaction Feed */}
        <RealtimeTransactionFeed maxItems={5} />

        {/* Transactions Table with Real-time Updates */}
        <TransactionsTable 
          transactions={allTransactions} 
          key={allTransactions.length} // Force re-render when transactions update
        />
      </div>
    </DashboardTemplate>
  );
}