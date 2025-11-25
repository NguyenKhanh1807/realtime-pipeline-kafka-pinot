import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// Import queryMetrics from the pinot route
// Since we can't directly import, we'll create a shared metrics file
// For now, we'll read metrics from a simple endpoint

export async function GET() {
  try {
    // Fetch current metrics from the pinot endpoint
    // This is a workaround - ideally we'd use a shared metrics store
    
    // For now, return a simple response that indicates we need to set up proper metrics
    const response = await fetch('http://localhost:3000/api/pinot/metrics-internal', {
      cache: 'no-store'
    });
    
    if (response.ok) {
      const metrics = await response.json();
      
      // Calculate derived metrics
      const avgLatency = metrics.totalQueries > 0 
        ? metrics.totalLatencyMs / metrics.totalQueries 
        : 0;
      
      const qpsLastMinute = metrics.queriesInLastMinute?.length || 0;
      const avgLatencyLastMinute = metrics.latenciesInLastMinute?.length > 0
        ? metrics.latenciesInLastMinute.reduce((a: number, b: number) => a + b, 0) / metrics.latenciesInLastMinute.length
        : 0;
      
      return NextResponse.json({
        total_queries: metrics.totalQueries,
        average_latency_ms: avgLatency,
        last_query_latency_ms: metrics.lastQueryLatencyMs,
        queries_per_minute: qpsLastMinute,
        avg_latency_last_minute_ms: avgLatencyLastMinute,
        timestamp: new Date().toISOString()
      });
    }
    
    return NextResponse.json({
      total_queries: 0,
      average_latency_ms: 0,
      last_query_latency_ms: 0,
      queries_per_minute: 0,
      avg_latency_last_minute_ms: 0,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json({
      total_queries: 0,
      average_latency_ms: 0,
      last_query_latency_ms: 0,
      queries_per_minute: 0,
      avg_latency_last_minute_ms: 0,
      timestamp: new Date().toISOString()
    });
  }
}
