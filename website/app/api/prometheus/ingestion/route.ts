import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch all ingestion metrics from Prometheus
    const [lagRes, offsetRes, endOffsetRes, consumingRes] = await Promise.all([
      fetch('http://localhost:9090/api/v1/query?query=pinot_kafka_consumer_lag_records'),
      fetch('http://localhost:9090/api/v1/query?query=pinot_kafka_current_offset'),
      fetch('http://localhost:9090/api/v1/query?query=pinot_kafka_log_end_offset'),
      fetch('http://localhost:9090/api/v1/query?query=pinot_consuming_segments_count')
    ]);

    const [lagData, offsetData, endOffsetData, consumingData] = await Promise.all([
      lagRes.json(),
      offsetRes.json(),
      endOffsetRes.json(),
      consumingRes.json()
    ]);

    // Extract values from Prometheus response format
    const extractValue = (data: any): number => {
      if (data?.data?.result && data.data.result.length > 0) {
        const value = parseFloat(data.data.result[0].value[1]);
        return isNaN(value) ? 0 : value;
      }
      return 0;
    };

    const metrics = {
      consumerLag: extractValue(lagData),
      currentOffset: extractValue(offsetData),
      logEndOffset: extractValue(endOffsetData),
      consumingSegments: extractValue(consumingData)
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Failed to fetch Prometheus metrics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch ingestion metrics',
        consumerLag: 0,
        currentOffset: 0,
        logEndOffset: 0,
        consumingSegments: 0
      },
      { status: 500 }
    );
  }
}
