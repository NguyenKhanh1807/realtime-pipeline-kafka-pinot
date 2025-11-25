# Grafana Monitoring for Apache Pinot

Complete monitoring setup for Apache Pinot using Grafana, Prometheus, and custom metrics exporters.

## Overview

This monitoring stack provides comprehensive observability for:
- **Apache Pinot**: Query performance, segment counts, table sizes, consumption lag
- **Kafka**: Message rates, broker metrics, topic statistics
- **System Metrics**: JVM memory, CPU, thread counts
- **Custom Metrics**: Real-time data pipeline health

## Architecture

```
┌─────────────────┐
│  Apache Pinot   │
│  (Controller,   │──┐
│  Broker, Server)│  │
└─────────────────┘  │
                     │
┌─────────────────┐  │    ┌──────────────┐    ┌──────────────┐
│  Kafka Broker   │──┼───▶│  Prometheus  │───▶│   Grafana    │
└─────────────────┘  │    │  (Time-series│    │ (Dashboards) │
                     │    │   Database)  │    └──────────────┘
┌─────────────────┐  │    └──────────────┘           │
│ Pinot Exporter  │──┘                               │
│  (Custom Python)│                                  │
└─────────────────┘                        http://localhost:3001
        │
        └─ Scrapes Pinot REST APIs every 15s
```

## Components

### 1. **Grafana** (Port 3001)
- Web-based visualization and dashboards
- Pre-configured with Pinot Performance Dashboard
- Default credentials: `admin` / `admin`

### 2. **Prometheus** (Port 9090)
- Time-series metrics database
- Scrapes metrics every 15 seconds
- 15-day retention by default

### 3. **Pinot Exporter** (Port 9091)
- Custom Python exporter for Pinot-specific metrics
- Exposes metrics at `/metrics` endpoint
- Monitors:
  - Table sizes and segment counts
  - Realtime consumption lag
  - Tenant and resource information

### 4. **JMX Exporter** (Port 5556)
- Exports Kafka JMX metrics to Prometheus format
- Monitors broker performance and JVM health

## Installation

### Prerequisites
```bash
# Install Python dependencies
pip install prometheus-client requests

# Or add to requirements.txt
echo "prometheus-client==0.19.0" >> requirements.txt
echo "requests==2.31.0" >> requirements.txt
pip install -r requirements.txt
```

### Start Monitoring Stack

```bash
# Make scripts executable
chmod +x monitoring/start_monitoring.sh
chmod +x monitoring/stop_monitoring.sh

# Start all monitoring services
./monitoring/start_monitoring.sh
```

This will:
1. Start Prometheus container
2. Start Grafana container
3. Start JMX Exporter container
4. Launch Pinot metrics exporter
5. Configure data sources and dashboards

### Manual Start

If you prefer to start services manually:

```bash
# Start Docker containers
docker-compose up -d prometheus grafana jmx-exporter

# Start Pinot exporter
cd monitoring
nohup python3 pinot_exporter.py > ../logs/pinot_exporter.log 2>&1 &
```

## Accessing Services

| Service | URL | Credentials |
|---------|-----|-------------|
| **Grafana** | http://localhost:3001 | admin / admin |
| **Prometheus** | http://localhost:9090 | - |
| **Pinot Metrics** | http://localhost:9091/metrics | - |

## Grafana Dashboard

The pre-configured "Pinot Performance Monitoring" dashboard includes:

### Query Performance
- **Query Rate**: Queries per second processed by broker
- **Query Latency (P95)**: 95th percentile query response time
- **Query Error Rate**: Failed queries over time

### Resource Utilization
- **Segment Count**: Number of segments per table and server
- **Table Sizes**: Storage size for each table
- **JVM Memory Usage**: Heap and non-heap memory across components

### Kafka Metrics
- **Message Rate**: Messages/second ingested into topics
- **Consumer Lag**: Real-time consumption lag per table

### Controller Metrics
- **Table Count**: Total number of tables
- **Tenant Count**: Active tenants in cluster

## Available Metrics

### Pinot Custom Metrics

```
# Segment counts
pinot_server_segment_count{table="transactions_REALTIME", server="all"}

# Table sizes in bytes
pinot_table_size_bytes{table="transactions_REALTIME"}

# Query performance
pinot_broker_queries_total
pinot_broker_query_latency_seconds

# Controller resources
pinot_controller_table_count
pinot_controller_tenant_count

# Realtime consumption
pinot_realtime_consumption_lag{table="transactions_REALTIME"}
```

### Kafka JMX Metrics

```
# Broker metrics
kafka_server_brokertopicmetrics_messagesin_total
kafka_server_brokertopicmetrics_bytesin_total

# JVM metrics
jvm_memory_heap_used
jvm_memory_heap_max
jvm_memory_nonheap_used
```

## Creating Custom Dashboards

### In Grafana UI:

1. Navigate to http://localhost:3001
2. Login with `admin` / `admin`
3. Click **+** → **Dashboard**
4. Click **Add new panel**
5. Select **Prometheus** as data source
6. Enter PromQL query (examples below)

### Example Queries

**Average Query Latency:**
```promql
avg(pinot_broker_query_latency_seconds)
```

**Segment Growth Rate:**
```promql
rate(pinot_server_segment_count[5m])
```

**Memory Usage Percentage:**
```promql
(jvm_memory_heap_used / jvm_memory_heap_max) * 100
```

**Top 5 Largest Tables:**
```promql
topk(5, pinot_table_size_bytes)
```

## Alerts Configuration

To set up alerts in Grafana:

1. Open a dashboard panel
2. Click panel title → **Edit**
3. Go to **Alert** tab
4. Click **Create Alert**
5. Set conditions (e.g., query latency > 500ms)
6. Configure notifications

### Example Alert Rules

**High Query Latency:**
```yaml
IF pinot_broker_query_latency_seconds{quantile="0.95"} > 1
FOR 5m
LABELS { severity="warning" }
ANNOTATIONS {
  summary = "High Pinot query latency"
  description = "P95 query latency is above 1 second"
}
```

**Low Segment Count (Data Loss):**
```yaml
IF pinot_server_segment_count < 1
FOR 5m
LABELS { severity="critical" }
ANNOTATIONS {
  summary = "No segments available"
  description = "Table {{ $labels.table }} has no segments"
}
```

## Troubleshooting

### Metrics Not Appearing

1. **Check Prometheus targets:**
   - Visit http://localhost:9090/targets
   - All targets should show "UP" status

2. **Verify Pinot exporter:**
   ```bash
   curl http://localhost:9091/metrics
   # Should return metrics in Prometheus format
   ```

3. **Check exporter logs:**
   ```bash
   tail -f logs/pinot_exporter.log
   ```

### Connection Issues

**Pinot Controller not reachable:**
```bash
# Test connectivity
curl http://localhost:9000/tables

# Check if controller is running
docker ps | grep pinot-controller
```

**Prometheus can't scrape targets:**
```bash
# Check network connectivity from Prometheus container
docker exec prometheus ping pinot-controller
docker exec prometheus wget -O- http://pinot-controller:9000/health
```

### Dashboard Not Loading

1. Check Prometheus data source configuration
2. Verify time range in dashboard
3. Run queries directly in Prometheus UI
4. Check Grafana logs:
   ```bash
   docker logs grafana
   ```

## Performance Tuning

### Exporter Configuration

Edit `monitoring/pinot_exporter.py`:

```python
# Adjust scrape interval (default: 15s)
time.sleep(15)  # Change to desired interval

# Modify timeout for API calls
response = requests.get(url, timeout=10)  # Increase if needed
```

### Prometheus Retention

Edit `monitoring/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s      # How often to scrape
  evaluation_interval: 15s  # How often to evaluate rules
```

Modify retention in `docker-compose.yml`:

```yaml
prometheus:
  command:
    - '--storage.tsdb.retention.time=30d'  # Keep 30 days of data
```

## Stopping Monitoring

```bash
# Stop all monitoring services
./monitoring/stop_monitoring.sh

# Or manually
docker-compose stop prometheus grafana jmx-exporter
pkill -f pinot_exporter.py
```

## Maintenance

### Backup Grafana Dashboards

```bash
# Export dashboard JSON
docker exec grafana curl -X GET http://admin:admin@localhost:3000/api/dashboards/uid/pinot-performance \
  > monitoring/grafana/dashboards/backup-$(date +%Y%m%d).json
```

### Update Prometheus Rules

Edit `monitoring/prometheus.yml` and reload:

```bash
docker exec prometheus kill -HUP 1
```

### Clean Prometheus Data

```bash
# Stop Prometheus
docker-compose stop prometheus

# Remove data volume
docker volume rm realtime-pipeline-kafka-pinot_prometheus-data

# Restart
docker-compose up -d prometheus
```

## Integration with Existing System

The monitoring stack integrates with your fraud detection pipeline:

- **Backend API**: Add Prometheus metrics to FastAPI (optional)
- **Data Generator**: Monitor transaction generation rates
- **ML Pipeline**: Track model inference latency

Example FastAPI integration:

```python
from prometheus_client import Counter, Histogram, make_asgi_app

# Add to app/main.py
from fastapi import FastAPI
from prometheus_client import make_asgi_app

app = FastAPI()

# Mount Prometheus metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

# Define custom metrics
fraud_predictions = Counter('fraud_predictions_total', 'Total fraud predictions')
api_latency = Histogram('api_request_duration_seconds', 'API request latency')
```

## Additional Resources

- [Prometheus Query Examples](https://prometheus.io/docs/prometheus/latest/querying/examples/)
- [Grafana Dashboard Best Practices](https://grafana.com/docs/grafana/latest/best-practices/)
- [Apache Pinot Metrics](https://docs.pinot.apache.org/operators/operating-pinot/monitoring)

## Support

For issues or questions:
1. Check logs in `logs/pinot_exporter.log`
2. Review Prometheus targets at http://localhost:9090/targets
3. Inspect Grafana data source settings
4. Verify Pinot API endpoints are accessible
