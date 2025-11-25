import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('http://localhost:9093/metrics', {
      cache: 'no-store'
    });
    
    if (response.ok) {
      const text = await response.text();
      const hasPinotMetrics = text.includes('pinot_');
      
      return NextResponse.json({
        healthy: hasPinotMetrics,
        status: hasPinotMetrics ? 'Exporting metrics' : 'No metrics found'
      });
    }
    
    return NextResponse.json(
      { healthy: false, error: 'Exporter not responding' },
      { status: 503 }
    );
  } catch (error) {
    return NextResponse.json(
      { healthy: false, error: error instanceof Error ? error.message : 'Connection failed' },
      { status: 503 }
    );
  }
}
