# Streamlit Data Ingestion Simulation

## Overview

The Streamlit app provides a dedicated interface for controlling and monitoring real-time transaction data ingestion into Kafka and Apache Pinot. This separates data generation controls from the main analytics dashboard, providing a focused simulation environment.

## Features

### 🎛️ Ingestion Controls
- **Start/Stop Producer**: Control data generation with a single click
- **Configurable Parameters**:
  - Interval: 1-30 seconds between transaction batches
  - Simulation Mode: auto, peak, normal, low, night
  - Historical Days: 0-7 days of past data to generate
  - Start Sequence: Custom transaction sequence numbering

### 📅 Historical Data Generation
- **Range**: Generate 0-7 days of historical data before realtime ingestion
- **Use Cases**:
  - **0 days**: Realtime-only mode (no historical data)
  - **1 day**: Yesterday's data for quick testing
  - **7 days**: Full week of data for comprehensive analytics
- **Pattern Fidelity**: Historical data uses realistic hourly patterns matching actual usage:
  - Night (0-5): Very low activity (1-2 tx/batch)
  - Business hours (9-17): High activity (8-15 tx/batch)
  - Evening (18-22): Medium activity (3-8 tx/batch)
- **Performance**: Generates ~10K-15K transactions per day (varies by hour)
- **Timestamp Accuracy**: Each transaction gets correct historical timestamp with random minute/second

### 📊 Live Metrics
- **Real-time Status**: Producer running state, process ID, uptime
- **Generation Statistics**: Records generated, last sequence number
- **Auto-refresh**: 5-second interval updates
- **Visual Charts**: Transaction flow over time

### 🔄 Data Flow Visualization
The app shows the complete data pipeline:
```
Producer → Kafka (transactions_raw) → Processor → Kafka (transactions_rt) → Pinot
```

## Installation

### Prerequisites
- Python 3.8+
- Backend API running on `http://localhost:8080`
- Kafka running on `localhost:9092`

### Install Dependencies

```bash
pip install -r streamlit_requirements.txt
```

Required packages:
- `streamlit` - Web interface framework
- `requests` - HTTP client for backend API
- `pandas` - Data manipulation for charts

## Usage

### Start Streamlit App

**Option 1: Using the startup script**
```bash
./start_streamlit.sh
```

**Option 2: Direct command**
```bash
streamlit run streamlit_app.py --server.port 8501 --server.address 0.0.0.0
```

### Access the Interface

Open your browser to:
```
http://localhost:8501
```

### Starting Data Ingestion

1. **Configure Parameters** (sidebar):
   - Set interval (recommended: 2 seconds)
   - Choose simulation mode (auto for realistic patterns)
   - **Set historical days** (0-7):
     - 0: Realtime only
     - 1-7: Generate past N days first
   - Set start sequence (default: 1)

2. **Click "▶️ Start Ingestion"**
   - If historical days > 0, generator first creates past data
   - Then producer starts real-time generation
   - Metrics begin updating in real-time

3. **Monitor Progress**:
   - Enable "🔄 Auto-refresh" for live updates
   - Watch transaction count increase
   - Track uptime and sequence numbers
   - Historical generation shows in logs

### Stopping Data Ingestion

1. Click "⏹️ Stop Ingestion" in sidebar
2. Producer gracefully stops
3. Metrics freeze at final state

## Simulation Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **auto** | Varies throughout the day based on time | Realistic daily patterns |
| **peak** | High volume (100-200 tx/batch) | Rush hour simulation |
| **normal** | Moderate volume (30-70 tx/batch) | Standard operations |
| **low** | Low volume (5-15 tx/batch) | Quiet periods |
| **night** | Minimal volume (1-5 tx/batch) | Late night hours |

## Architecture

### Backend API Integration

The Streamlit app communicates with FastAPI backend:

**Endpoints Used**:
- `GET /api/data-generation/status` - Check producer state
- `POST /api/data-generation/start` - Start producer with config
- `POST /api/data-generation/stop` - Stop producer

**Request Format** (start):
```json
{
  "interval_seconds": 2,
  "simulation_mode": "auto",
  "start_sequence": 1,
  "historical_days": 7,
  "topic_raw": "transactions_raw",
  "bootstrap_servers": "localhost:9092"
}
```

**Response Format** (status):
```json
{
  "is_running": true,
  "process_id": 12345,
  "started_at": "2025-11-24T10:30:00Z",
  "simulation_mode": "auto",
  "interval_seconds": 2,
  "historical_days": 7,
  "records_generated": 15420,
  "last_sequence": 15420
}
```

### Data Source

- **1000 users** from PostgreSQL database
- **20 countries**: US, GB, VN, JP, KR, SG, CN, IN, AU, CA, DE, FR, IT, ES, BR, MX, TH, ID, MY, PH
- Realistic transaction patterns with fraud simulation

## Configuration

### Environment Variables

Set in `.env` or directly in `streamlit_app.py`:

```python
BACKEND_URL = "http://localhost:8080"  # FastAPI backend
```

### Streamlit Settings

Customize in `.streamlit/config.toml`:

```toml
[server]
port = 8501
address = "0.0.0.0"

[theme]
primaryColor = "#FF4B4B"
backgroundColor = "#FFFFFF"
secondaryBackgroundColor = "#F0F2F6"
textColor = "#262730"
```

## Troubleshooting

### Producer Won't Start

**Symptom**: Error message when clicking "Start Ingestion"

**Solutions**:
1. Check backend API is running:
   ```bash
   curl http://localhost:8080/api/data-generation/status
   ```

2. Verify Kafka is accessible:
   ```bash
   docker ps | grep kafka
   ```

3. Check producer logs in backend terminal

### Metrics Not Updating

**Symptom**: Auto-refresh enabled but numbers don't change

**Solutions**:
1. Toggle auto-refresh off/on
2. Manually refresh browser (Ctrl+R)
3. Check browser console for errors
4. Verify backend API responds to status endpoint

### Connection Refused

**Symptom**: "Connection refused" or timeout errors

**Solutions**:
1. Ensure backend is running on port 8080:
   ```bash
   lsof -i :8080
   ```

2. Check firewall settings allow localhost:8501 and localhost:8080

3. Verify `BACKEND_URL` in `streamlit_app.py` is correct

## Integration with Main Dashboard

The Streamlit app is **separate** from the Next.js dashboard:

| Feature | Streamlit App | Next.js Dashboard |
|---------|---------------|-------------------|
| **Purpose** | Data ingestion control | Analytics & monitoring |
| **Port** | 8501 | 3000 |
| **Focus** | Producer simulation | Transaction analysis |
| **Users** | Operators/testers | Analysts/managers |

**Workflow**:
1. Use **Streamlit** to start/configure data generation
2. Use **Next.js Dashboard** to analyze incoming transactions
3. Monitor both in parallel for complete visibility

## Advanced Features

### Custom Start Sequence

Start from specific transaction ID:
```
Start Sequence: 10000
```
Useful for:
- Continuing after restart
- Testing specific ID ranges
- Avoiding duplicate keys

### Extended Monitoring

Enable auto-refresh and let run for extended periods:
- Tracks uptime automatically
- Shows cumulative records generated
- Useful for stress testing

### Mode Switching

Switch modes without restarting:
1. Stop producer
2. Change simulation mode
3. Start producer again
4. Observe different traffic patterns

## Performance

### Resource Usage
- **CPU**: ~1-2% (Streamlit + Python backend)
- **Memory**: ~100-200 MB
- **Network**: Minimal (status polling every 5s)

### Scalability
- Handles producer generating 1000+ tx/sec
- Auto-refresh stable up to 60 continuous updates
- No performance degradation with long runtimes

## Development

### File Structure
```
realtime-pipeline-kafka-pinot/
├── streamlit_app.py              # Main Streamlit application
├── streamlit_requirements.txt    # Python dependencies
├── start_streamlit.sh            # Startup script
└── docs/
    └── STREAMLIT_INGESTION.md    # This file
```

### Extending the App

**Add new metrics**:
```python
# In metrics section
with col5:
    st.metric(
        "New Metric",
        status.get("new_field", "—")
    )
```

**Add new configuration**:
```python
# In sidebar configuration
new_param = st.sidebar.slider(
    "New Parameter",
    min_value=1,
    max_value=100,
    value=50
)

# Include in config dict
config = {
    # ... existing fields
    "new_param": new_param
}
```

### Testing

**Manual Testing**:
```bash
# Start app
./start_streamlit.sh

# In browser, test:
# 1. Start ingestion with different modes
# 2. Verify metrics update
# 3. Stop ingestion
# 4. Restart with different config
```

**API Testing**:
```bash
# Test status endpoint
curl http://localhost:8080/api/data-generation/status

# Test start endpoint
curl -X POST http://localhost:8080/api/data-generation/start \
  -H "Content-Type: application/json" \
  -d '{"interval_seconds": 2, "simulation_mode": "auto", "start_sequence": 1}'

# Test stop endpoint
curl -X POST http://localhost:8080/api/data-generation/stop
```

## Best Practices

### Simulation Recommendations
1. **Start with auto mode** for realistic patterns
2. **Use 2-second interval** for balanced load
3. **Historical data**: Use 7 days for comprehensive daily analytics testing
4. **Monitor Kafka lag** in parallel (Grafana)
5. **Run peak mode** during stress testing only

### Production Use
1. **Not for production** - This is a simulation tool
2. **Development/staging only** - Testing and demos
3. **Control access** - Don't expose port 8501 publicly
4. **Monitor resources** - Watch Kafka/Pinot capacity

### Data Quality
1. **Start sequence tracking** - Avoid gaps in transaction IDs
2. **Mode consistency** - Don't frequently switch modes
3. **Graceful stops** - Always use stop button, not kill/Ctrl+C
4. **Verify data flow** - Check Pinot ingestion after starting

## FAQ

**Q: How long does it take to generate 7 days of historical data?**
A: Approximately 2-5 minutes depending on system performance. Progress shown in backend logs.

**Q: Can I add more historical days after starting?**
A: No, historical generation happens once at startup. Stop and restart with desired days.

**Q: Does historical data affect realtime performance?**
A: No, historical generation completes first, then realtime begins normally.

**Q: Can I run multiple producers?**
A: No, the backend only supports one producer instance. Stop current before starting new.

**Q: What happens if Streamlit crashes?**
A: Producer continues running in background. Restart Streamlit to regain control.

**Q: How do I reset transaction sequence?**
A: Set "Start Sequence" to 1 when starting producer.

**Q: Can I change config while running?**
A: No, stop producer first, then start with new configuration.

**Q: Does auto-refresh consume much bandwidth?**
A: Minimal - only ~1KB per 5-second status poll.

## Related Documentation

- [Data Generation Update](../DATA_GENERATION_UPDATE.md) - Producer implementation details
- [API Quick Reference](../API_QUICK_REFERENCE.md) - All backend API endpoints
- [Ingestion Tracking](INGESTION_TRACKING.md) - Kafka/Pinot ingestion monitoring
- [Architecture Diagram](ARCHITECTURE_DIAGRAM.txt) - System overview

## Support

For issues or questions:
1. Check logs in terminal running Streamlit
2. Check backend API logs
3. Verify Kafka/Pinot container status
4. Review this documentation's troubleshooting section
