import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('http://localhost:3001/api/health', {
      cache: 'no-store'
    });
    
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        healthy: data.database === 'ok',
        version: data.version,
        database: data.database
      });
    }
    
    return NextResponse.json(
      { healthy: false, error: 'Grafana not responding' },
      { status: 503 }
    );
  } catch (error) {
    return NextResponse.json(
      { healthy: false, error: error instanceof Error ? error.message : 'Connection failed' },
      { status: 503 }
    );
  }
}
