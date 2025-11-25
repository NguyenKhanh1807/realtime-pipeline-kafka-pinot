#!/usr/bin/env python3
"""
Pinot Metrics Exporter for Prometheus
Exposes Pinot cluster metrics in Prometheus format
"""

import requests
import time
from prometheus_client import start_http_server, Gauge, Counter, Histogram, Summary
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pinot endpoints
PINOT_CONTROLLER = "http://localhost:9000"
PINOT_BROKER = "http://localhost:8099"
NEXTJS_API = "http://localhost:3000"

# Prometheus metrics
pinot_segment_count = Gauge('pinot_server_segment_count', 'Number of segments', ['table', 'server'])
pinot_table_size = Gauge('pinot_table_size_bytes', 'Table size in bytes', ['table'])
pinot_query_count = Counter('pinot_broker_queries_total', 'Total queries processed')
pinot_query_latency = Histogram('pinot_broker_query_latency_seconds', 'Query latency in seconds', 
                                buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0])
pinot_table_count = Gauge('pinot_controller_table_count', 'Number of tables')
pinot_tenant_count = Gauge('pinot_controller_tenant_count', 'Number of tenants')
pinot_realtime_lag = Gauge('pinot_realtime_consumption_lag', 'Realtime consumption lag', ['table'])

# New metrics for query rate and latency from Next.js
pinot_queries_per_minute = Gauge('pinot_queries_per_minute', 'Number of queries in the last minute')
pinot_avg_latency_ms = Gauge('pinot_average_latency_ms', 'Average query latency in milliseconds')
pinot_last_query_latency_ms = Gauge('pinot_last_query_latency_ms', 'Last query latency in milliseconds')

# Ingestion metrics
pinot_kafka_consumer_lag = Gauge('pinot_kafka_consumer_lag_records', 'Kafka consumer lag in records', ['consumer_group', 'topic', 'partition'])
pinot_kafka_current_offset = Gauge('pinot_kafka_current_offset', 'Current Kafka offset', ['consumer_group', 'topic', 'partition'])
pinot_kafka_log_end_offset = Gauge('pinot_kafka_log_end_offset', 'Kafka log end offset', ['consumer_group', 'topic', 'partition'])
pinot_ingestion_rate = Gauge('pinot_ingestion_rate_records_per_sec', 'Ingestion rate in records per second', ['table'])
pinot_consuming_segments = Gauge('pinot_consuming_segments_count', 'Number of consuming segments', ['table'])


def fetch_table_stats():
    """Fetch table statistics from Pinot controller"""
    try:
        response = requests.get(f"{PINOT_CONTROLLER}/tables", timeout=5)
        if response.status_code == 200:
            tables = response.json().get('tables', [])
            pinot_table_count.set(len(tables))
            
            for table in tables:
                try:
                    # Get table size
                    size_response = requests.get(
                        f"{PINOT_CONTROLLER}/tables/{table}/size",
                        timeout=5
                    )
                    if size_response.status_code == 200:
                        size_data = size_response.json()
                        total_size = size_data.get('reportedSizeInBytes', 0)
                        pinot_table_size.labels(table=table).set(total_size)
                    
                    # Get segment info
                    segment_response = requests.get(
                        f"{PINOT_CONTROLLER}/segments/{table}",
                        timeout=5
                    )
                    if segment_response.status_code == 200:
                        segments_data = segment_response.json()
                        # The response is a list with one dict containing REALTIME/OFFLINE keys
                        segment_count = 0
                        if isinstance(segments_data, list) and len(segments_data) > 0:
                            segment_dict = segments_data[0]
                            # Count segments from both REALTIME and OFFLINE
                            realtime_segments = segment_dict.get('REALTIME', [])
                            offline_segments = segment_dict.get('OFFLINE', [])
                            segment_count = len(realtime_segments) + len(offline_segments)
                        pinot_segment_count.labels(table=table, server='all').set(segment_count)
                        
                except Exception as e:
                    logger.error(f"Error fetching stats for table {table}: {e}")
                    
    except Exception as e:
        logger.error(f"Error fetching table list: {e}")


def fetch_tenant_stats():
    """Fetch tenant statistics"""
    try:
        response = requests.get(f"{PINOT_CONTROLLER}/tenants", timeout=5)
        if response.status_code == 200:
            tenants = response.json().get('BROKER_TENANTS', [])
            pinot_tenant_count.set(len(tenants))
    except Exception as e:
        logger.error(f"Error fetching tenant stats: {e}")


def fetch_realtime_consumption_lag():
    """Fetch realtime consumption lag"""
    try:
        response = requests.get(f"{PINOT_CONTROLLER}/tables", timeout=5)
        if response.status_code == 200:
            tables = response.json().get('tables', [])
            
            for table in tables:
                if 'REALTIME' in table:
                    try:
                        lag_response = requests.get(
                            f"{PINOT_CONTROLLER}/tables/{table}/consumingSegmentsInfo",
                            timeout=5
                        )
                        if lag_response.status_code == 200:
                            lag_data = lag_response.json()
                            # Extract lag information if available
                            for segment_info in lag_data.get('segments', []):
                                lag = segment_info.get('consumerLag', 0)
                                pinot_realtime_lag.labels(table=table).set(lag)
                    except Exception as e:
                        logger.error(f"Error fetching lag for {table}: {e}")
                        
    except Exception as e:
        logger.error(f"Error fetching realtime lag: {e}")


def fetch_query_metrics():
    """Fetch query metrics from Next.js API"""
    try:
        response = requests.get(f"{NEXTJS_API}/api/pinot?action=metrics", timeout=5)
        if response.status_code == 200:
            data = response.json()
            
            # Update Prometheus metrics
            qpm = data.get('queriesPerMinute', 0)
            avg_latency = data.get('avgLatencyLastMinuteMs', 0)
            last_latency = data.get('lastQueryLatencyMs', 0)
            total_queries = data.get('totalQueries', 0)
            
            pinot_queries_per_minute.set(qpm)
            pinot_avg_latency_ms.set(avg_latency)
            pinot_last_query_latency_ms.set(last_latency)
            
            # Update query count (set to total, Counter will handle incrementing)
            # Note: This resets on restart, but that's acceptable
            if total_queries > 0:
                # Record latency distribution
                latencies = data.get('latenciesInLastMinute', [])
                for lat_ms in latencies:
                    pinot_query_latency.observe(lat_ms / 1000.0)  # Convert to seconds
                    
            logger.info(f"Query metrics: {qpm} QPM, Avg latency: {avg_latency:.2f}ms")
            
    except Exception as e:
        logger.error(f"Error fetching query metrics: {e}")


def fetch_kafka_ingestion_metrics():
    """Fetch Kafka consumer lag and ingestion metrics"""
    try:
        import subprocess
        
        # Get Kafka consumer lag from docker
        result = subprocess.run(
            ['docker', 'exec', 'kafka', 'kafka-consumer-groups', 
             '--bootstrap-server', 'localhost:9092', 
             '--group', 'rt-processor-v1', 
             '--describe'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            lines = result.stdout.strip().split('\n')
            for line in lines[1:]:  # Skip header
                parts = line.split()
                if len(parts) >= 6:
                    topic = parts[1]
                    partition = parts[2]
                    current_offset = int(parts[3])
                    log_end_offset = int(parts[4])
                    lag = int(parts[5])
                    
                    pinot_kafka_consumer_lag.labels(
                        consumer_group='rt-processor-v1',
                        topic=topic,
                        partition=partition
                    ).set(lag)
                    
                    pinot_kafka_current_offset.labels(
                        consumer_group='rt-processor-v1',
                        topic=topic,
                        partition=partition
                    ).set(current_offset)
                    
                    pinot_kafka_log_end_offset.labels(
                        consumer_group='rt-processor-v1',
                        topic=topic,
                        partition=partition
                    ).set(log_end_offset)
                    
            logger.info(f"Kafka ingestion metrics updated")
    except Exception as e:
        logger.error(f"Error fetching Kafka ingestion metrics: {e}")


def fetch_consuming_segment_metrics():
    """Fetch consuming segment information and ingestion rate"""
    try:
        response = requests.get(f"{PINOT_CONTROLLER}/tables", timeout=5)
        if response.status_code == 200:
            tables = response.json().get('tables', [])
            
            for table in tables:
                # Get consuming segments info
                try:
                    consuming_response = requests.get(
                        f"{PINOT_CONTROLLER}/tables/{table}/consumingSegmentsInfo",
                        timeout=5
                    )
                    
                    if consuming_response.status_code == 200:
                        consuming_data = consuming_response.json()
                        segment_map = consuming_data.get('_segmentToConsumingInfoMap', {})
                        
                        # Count consuming segments
                        consuming_count = len(segment_map)
                        pinot_consuming_segments.labels(table=table).set(consuming_count)
                        
                        # Calculate ingestion rate from partition offsets
                        total_records_ingested = 0
                        for segment_name, servers in segment_map.items():
                            server_info = servers[0] if isinstance(servers, list) else servers
                            partition_offset_info = server_info.get('partitionOffsetInfo', {})
                            current_offsets = partition_offset_info.get('currentOffsetsMap', {})
                            
                            for partition, offset in current_offsets.items():
                                total_records_ingested += int(offset)
                        
                        # This is cumulative, not rate - would need to track delta over time
                        # For now, just expose the consuming segment count
                        
                        logger.info(f"Table {table}: {consuming_count} consuming segments")
                        
                except Exception as e:
                    logger.error(f"Error fetching consuming segments for {table}: {e}")
                    
    except Exception as e:
        logger.error(f"Error in fetch_consuming_segment_metrics: {e}")


def collect_metrics():
    """Main collection loop"""
    logger.info("Starting Pinot metrics collection...")
    
    while True:
        try:
            fetch_table_stats()
            fetch_tenant_stats()
            fetch_realtime_consumption_lag()
            fetch_query_metrics()
            fetch_kafka_ingestion_metrics()
            fetch_consuming_segment_metrics()
            logger.info("Metrics collected successfully")
        except Exception as e:
            logger.error(f"Error in metrics collection: {e}")
        
        time.sleep(15)  # Collect every 15 seconds


if __name__ == '__main__':
    # Start Prometheus HTTP server on port 9093
    start_http_server(9093)
    logger.info("Pinot metrics exporter started on port 9093")
    
    # Start metrics collection
    collect_metrics()
