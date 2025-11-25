import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pinotUrl = process.env.PINOT_BROKER_URL || 'http://localhost:8099';
    
    console.log('[Pinot Proxy] Forwarding query to:', pinotUrl);
    console.log('[Pinot Proxy] Query:', body.sql?.substring(0, 100) + '...');

    const response = await fetch(`${pinotUrl}/query/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error('[Pinot Proxy] Query failed:', response.status, response.statusText);
      return NextResponse.json(
        { error: `Pinot query failed: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Pinot Proxy] Query successful, rows:', data.resultTable?.rows?.length || 0);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Pinot Proxy] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
