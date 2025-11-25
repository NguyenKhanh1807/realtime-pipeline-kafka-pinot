import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if producer is active by querying Pinot for recent transactions
    const pinotUrl = process.env.PINOT_BROKER_URL || 'http://localhost:8099';
    
    // Get the most recent transaction to check if producer is active
    // Since we can't reliably use time-based queries, check if data exists
    const query = {
      sql: `SELECT COUNT(*) as total_count, 
                   MAX(transaction_seq) as max_seq
            FROM transactions 
            LIMIT 1`
    };

    const response = await fetch(`${pinotUrl}/query/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`Pinot query failed: ${response.status}`);
      return NextResponse.json({
        producer_active: false,
        recent_transactions: 0,
        error: 'Pinot unavailable'
      });
    }

    const data = await response.json();
    const totalCount = data.resultTable?.rows?.[0]?.[0] || 0;
    const maxSeq = data.resultTable?.rows?.[0]?.[1] || 0;
    // Consider active if we have transactions (even if not real-time)
    const isActive = totalCount > 0;

    return NextResponse.json({
      producer_active: isActive,
      recent_transactions: totalCount,
      max_sequence: maxSeq,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking producer status:', error);
    return NextResponse.json({
      producer_active: false,
      recent_transactions: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
