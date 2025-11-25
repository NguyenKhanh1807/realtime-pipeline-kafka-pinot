import { NextRequest, NextResponse } from 'next/server';

// In-memory metrics storage
let queryMetrics = {
  totalQueries: 0,
  totalLatencyMs: 0,
  lastQueryLatencyMs: 0,
  queriesInLastMinute: [] as number[], // timestamps
  latenciesInLastMinute: [] as number[], // latencies in ms
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    // Get Pinot configuration from environment variables
    const pinotBrokerUrl = process.env.NEXT_PUBLIC_PINOT_BROKER_URL || 'http://localhost:8099';
    const pinotQueryPath = process.env.NEXT_PUBLIC_PINOT_QUERY_PATH || '/query/sql';
    
    console.log('Proxying request to Pinot:', pinotBrokerUrl + pinotQueryPath);
    console.log('Query:', body.sql);
    
    // Forward the request to Pinot
    const pinotResponse = await fetch(`${pinotBrokerUrl}${pinotQueryPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!pinotResponse.ok) {
      throw new Error(`Pinot API error: ${pinotResponse.status} ${pinotResponse.statusText}`);
    }
    
    const data = await pinotResponse.json();
    
    // Record query metrics
    const latency = Date.now() - startTime;
    queryMetrics.totalQueries++;
    queryMetrics.totalLatencyMs += latency;
    queryMetrics.lastQueryLatencyMs = latency;
    
    // Track queries in the last minute
    const now = Date.now();
    queryMetrics.queriesInLastMinute.push(now);
    queryMetrics.latenciesInLastMinute.push(latency);
    
    // Clean up old entries (older than 1 minute)
    const oneMinuteAgo = now - 60000;
    queryMetrics.queriesInLastMinute = queryMetrics.queriesInLastMinute.filter(t => t > oneMinuteAgo);
    queryMetrics.latenciesInLastMinute = queryMetrics.latenciesInLastMinute.filter((_, i) => 
      queryMetrics.queriesInLastMinute[i] !== undefined
    );
    
    console.log('Pinot response received:', data);
    console.log(`Query latency: ${latency}ms`);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Pinot proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to query Pinot', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  // Metrics endpoint
  if (action === 'metrics') {
    const avgLatency = queryMetrics.totalQueries > 0 
      ? queryMetrics.totalLatencyMs / queryMetrics.totalQueries 
      : 0;
    
    const qpsLastMinute = queryMetrics.queriesInLastMinute.length;
    const avgLatencyLastMinute = queryMetrics.latenciesInLastMinute.length > 0
      ? queryMetrics.latenciesInLastMinute.reduce((a, b) => a + b, 0) / queryMetrics.latenciesInLastMinute.length
      : 0;
    
    return NextResponse.json({
      totalQueries: queryMetrics.totalQueries,
      averageLatencyMs: avgLatency,
      lastQueryLatencyMs: queryMetrics.lastQueryLatencyMs,
      queriesPerMinute: qpsLastMinute,
      avgLatencyLastMinuteMs: avgLatencyLastMinute,
      queriesInLastMinute: queryMetrics.queriesInLastMinute.length,
      latenciesInLastMinute: queryMetrics.latenciesInLastMinute,
      timestamp: new Date().toISOString()
    });
  }
  
  // Health check endpoint
  try {
    const pinotBrokerUrl = process.env.NEXT_PUBLIC_PINOT_BROKER_URL || 'http://localhost:8099';
    const pinotHealthPath = process.env.NEXT_PUBLIC_PINOT_HEALTH_PATH || '/health';
    
    const response = await fetch(`${pinotBrokerUrl}${pinotHealthPath}`);
    const isHealthy = response.ok;
    
    return NextResponse.json({ healthy: isHealthy, status: response.status });
  } catch (error) {
    return NextResponse.json({ healthy: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}