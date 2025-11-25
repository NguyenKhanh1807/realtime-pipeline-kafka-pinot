import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('http://localhost:9090/-/healthy', {
      cache: 'no-store'
    });
    
    const healthy = response.ok;
    
    if (healthy) {
      return NextResponse.json({
        healthy: true,
        status: 'Metrics collection active'
      });
    }
    
    return NextResponse.json(
      { healthy: false, error: 'Prometheus not responding' },
      { status: 503 }
    );
  } catch (error) {
    return NextResponse.json(
      { healthy: false, error: error instanceof Error ? error.message : 'Connection failed' },
      { status: 503 }
    );
  }
}
