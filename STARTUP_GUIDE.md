# Complete Startup Guide - Realtime Pipeline Kafka-Pinot

This guide provides step-by-step instructions to start the entire application from scratch.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Docker Services](#docker-services)
4. [Database Setup](#database-setup)
5. [Pinot Configuration](#pinot-configuration)
6. [Monitoring Setup](#monitoring-setup)
7. [Application Services](#application-services)
8. [Data Generation](#data-generation)
9. [ML Model Training](#ml-model-training)
10. [Verification](#verification)
11. [Troubleshooting](#troubleshooting)
12. [Stopping Services](#stopping-services)

---

## Prerequisites

### Required Software
- **Docker** (v20.10+) and **Docker Compose** (v2.0+)
- **Python** (3.8+)
- **Node.js** (18+) and **npm** or **pnpm**
- **Git**

### System Requirements
- **RAM**: Minimum 8GB (16GB recommended)
- **Disk**: Minimum 20GB free space
- **CPU**: 4+ cores recommended

### Check Prerequisites
```bash
docker --version
docker-compose --version
python3 --version
node --version
npm --version
git --version
```

---

## Initial Setup

### 1. Clone Repository (if not already done)
```bash
git clone https://github.com/NguyenKhanh1807/realtime-pipeline-kafka-pinot.git
cd realtime-pipeline-kafka-pinot
```

### 2. Create Required Directories
```bash
# Create log directory
mkdir -p logs

# Create data directories
mkdir -p data
mkdir -p segments

# Create MLflow directories
mkdir -p mlruns
mkdir -p mlartifacts

# Create model directories
mkdir -p models
mkdir -p artifacts
```

### 3. Set Permissions
```bash
# Make scripts executable
chmod +x start_all.sh
chmod +x scripts/*.sh
chmod +x scripts/*.py
```

---

## Docker Services

### 1. Start All Docker Containers
```bash
# Start all services in detached mode
docker-compose up -d

# Wait for services to initialize (30-60 seconds)
sleep 60
```

### 2. Verify Docker Containers
```bash
# Check all containers are running
docker-compose ps

# Expected containers:
# - zookeeper (port 2181)
# - kafka (ports 9092, 29092)
# - pinot-controller (ports 9000, 9001)
# - pinot-broker (port 8099)
# - pinot-server (ports 8097, 8098)
# - postgres (port 5432)
# - prometheus (port 9090)
# - grafana (port 3001)
# - mlflow (port 5000)
```

### 3. View Container Logs (if needed)
```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f kafka
docker-compose logs -f pinot-controller
docker-compose logs -f postgres
```

---

## Database Setup

### 1. Initialize PostgreSQL Database
```bash
# Wait for PostgreSQL to be ready
sleep 10

# Run migrations
docker exec -i postgres psql -U postgres -d postgres < migrations/002_create_auth_tables.sql
docker exec -i postgres psql -U postgres -d postgres < migrations/003_create_transaction_users.sql
docker exec -i postgres psql -U postgres -d postgres < migrations/003_create_user_bans_table.sql
```

### 2. Create Initial Users
```bash
# Create transaction users (251 users)
python3 scripts/create_transaction_users.py

# Create testing user
python3 scripts/create_testing_user.py
```

### 3. Verify Database
```bash
# Connect to database
docker exec -it postgres psql -U postgres -d postgres

# Check tables
\dt

# Check user count
SELECT COUNT(*) FROM transaction_users;

# Exit
\q
```

---

## Pinot Configuration

### 1. Create Pinot Schema
```bash
# Add schema to Pinot
curl -X POST "http://localhost:9000/schemas" \
  -H "Content-Type: application/json" \
  -d @conf/transactions_schema.json
```

### 2. Create Pinot Tables
```bash
# Create realtime table
curl -X POST "http://localhost:9000/tables" \
  -H "Content-Type: application/json" \
  -d @conf/transactions_realtime_table.json

# Create offline table
curl -X POST "http://localhost:9000/tables" \
  -H "Content-Type: application/json" \
  -d @conf/transactions_offline_table.json
```

### 3. Verify Pinot Setup
```bash
# Check schemas
curl -s "http://localhost:9000/schemas" | python3 -m json.tool

# Check tables
curl -s "http://localhost:9000/tables" | python3 -m json.tool

# Access Pinot UI
echo "Pinot Controller UI: http://localhost:9000"
```

### 4. Setup Minion Tasks (for offline table management)
```bash
# Run minion setup script
bash scripts/setup_minion_task.sh

# Verify minion task
curl -s "http://localhost:9000/tasks/tasktypes" | python3 -m json.tool
```

---

## Monitoring Setup

### 1. Start Pinot Exporter (Prometheus Metrics)
```bash
# Start in background
nohup python3 monitoring/pinot_exporter.py > logs/pinot_exporter.log 2>&1 &

# Get PID for later reference
echo $! > logs/pinot_exporter.pid
```

### 2. Verify Prometheus
```bash
# Check Prometheus is collecting metrics
curl -s "http://localhost:9090/api/v1/targets" | python3 -m json.tool

# Access Prometheus UI
echo "Prometheus UI: http://localhost:9090"
```

### 3. Configure Grafana
```bash
# Access Grafana
echo "Grafana UI: http://localhost:3001"
echo "Username: admin"
echo "Password: admin"

# Grafana should auto-configure dashboards from docker-compose
```

### 4. Access MLflow
```bash
# MLflow should be running
echo "MLflow UI: http://localhost:5000"
```

---

## Application Services

### 1. Install Python Dependencies
```bash
# Install Python packages
pip3 install -r requirements.txt

# Or use virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Install Node.js Dependencies
```bash
# Navigate to website directory
cd website

# Install dependencies (choose one)
npm install
# or
pnpm install

# Return to root
cd ..
```

### 3. Start FastAPI Backend
```bash
# Start API server in background
cd app
nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload > ../logs/api.log 2>&1 &
echo $! > ../logs/api.pid
cd ..

# Verify API is running
sleep 5
curl -s "http://localhost:8000/health" | python3 -m json.tool
```

### 4. Start Next.js Frontend
```bash
# Navigate to website directory
cd website

# Development mode
npm run dev
# or
pnpm dev

# Production mode (alternative)
# npm run build
# npm run start

# Frontend will be available at: http://localhost:3000
```

**Note**: Keep the Next.js server running in this terminal. Open a new terminal for remaining steps.

---

## Data Generation

### 1. Start Real-time Producer
```bash
# In a new terminal, navigate to project root
cd /path/to/realtime-pipeline-kafka-pinot

# Start producer
cd crawl_data
nohup python3 rt_producer.py > ../logs/producer.log 2>&1 &
echo $! > ../logs/producer.pid
cd ..

# Verify producer is running
sleep 5
tail -f logs/producer.log
# Press Ctrl+C to stop viewing logs
```

### 2. Start Real-time Processor
```bash
# Start processor (consumes from Kafka, writes to Pinot)
cd crawl_data
nohup python3 rt_processor.py > ../logs/processor.log 2>&1 &
echo $! > ../logs/processor.pid
cd ..

# Verify processor is running
sleep 5
tail -f logs/processor.log
# Press Ctrl+C to stop viewing logs
```

### 3. Start ML Fraud Detector
```bash
# Start ML-based fraud detection
cd crawl_data
nohup python3 ml_fraud_detector.py > ../logs/ml_detector.log 2>&1 &
echo $! > ../logs/ml_detector.pid
cd ..

# Verify ML detector is running
sleep 5
tail -f logs/ml_detector.log
# Press Ctrl+C to stop viewing logs
```

### 4. Start Auto-Ban Monitor
```bash
# Start auto-ban system
nohup python3 -u scripts/auto_ban_monitor.py > logs/auto_ban_monitor.log 2>&1 &
echo $! > logs/auto_ban_monitor.pid

# Verify auto-ban is running
sleep 5
tail -f logs/auto_ban_monitor.log
# Press Ctrl+C to stop viewing logs
```

### 5. Verify Data Flow
```bash
# Check Kafka topics
docker exec kafka kafka-topics --list --bootstrap-server localhost:9092

# Check Kafka consumer groups
docker exec kafka kafka-consumer-groups --bootstrap-server localhost:9092 --list

# Check consumer lag
docker exec kafka kafka-consumer-groups --bootstrap-server localhost:9092 \
  --group rt-processor-v1 --describe

# Query Pinot for recent data
curl -X POST "http://localhost:8099/query/sql" \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT COUNT(*) FROM transactions WHERE create_dt >= NOW() - 60000"}'
```

---

## ML Model Training

### 1. Initial Model Training
```bash
# Train initial fraud detection model
python3 scripts/train_and_export_mlflow.py

# Verify model in MLflow UI
echo "Check MLflow: http://localhost:5000"
```

### 2. Setup Auto-Retrain (Optional)
```bash
# Start segment monitor for auto-retraining
nohup python3 -u app/segment_monitor.py > logs/segment_monitor.log 2>&1 &
echo $! > logs/segment_monitor.pid

# This will automatically retrain when new segments are created
```

### 3. Verify Model Deployment
```bash
# Check if model is loaded
curl -s "http://localhost:8000/model/info" | python3 -m json.tool

# Test fraud detection
curl -X POST "http://localhost:8000/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "user_seq": 1,
    "deposit_amount": 1000,
    "withdrawal_amount": 500,
    "current_balance": 5000,
    "frequency": 10
  }'
```

---

## Verification

### 1. Check All Services Status
```bash
# Docker containers
docker-compose ps

# Python processes
ps aux | grep python3

# Node processes
ps aux | grep node

# Ports in use
netstat -tulpn | grep -E '3000|3001|5000|5432|8000|8097|8098|8099|9000|9090|9092'
```

### 2. Access All UIs

Open in your browser:

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Use created test user |
| **FastAPI Docs** | http://localhost:8000/docs | N/A |
| **Pinot Controller** | http://localhost:9000 | N/A |
| **Pinot Broker Query** | http://localhost:8099 | N/A |
| **Grafana** | http://localhost:3001 | admin / admin |
| **Prometheus** | http://localhost:9090 | N/A |
| **MLflow** | http://localhost:5000 | N/A |

### 3. Test Data Flow

```bash
# Wait for some data (2-3 minutes)
sleep 180

# Check transaction count
curl -X POST "http://localhost:8099/query/sql" \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT COUNT(*) FROM transactions"}' | python3 -m json.tool

# Check recent transactions
curl -X POST "http://localhost:8099/query/sql" \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT * FROM transactions ORDER BY create_dt DESC LIMIT 10"}' | python3 -m json.tool

# Check fraud detection
curl -X POST "http://localhost:8099/query/sql" \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT label, COUNT(*) FROM transactions GROUP BY label"}' | python3 -m json.tool
```

### 4. Test Frontend Features

1. **Login**: Navigate to http://localhost:3000 and login with test user
2. **Dashboard**: View real-time metrics and charts
3. **Transactions**: Monitor transaction stream
4. **Database Management**: Check system health
5. **Data Generation**: View producer/processor status
6. **Model Performance**: Check ML metrics

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find process using port
sudo lsof -i :PORT_NUMBER

# Kill process
kill -9 PID
```

#### 2. Docker Containers Not Starting
```bash
# Stop all containers
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down -v

# Restart
docker-compose up -d
```

#### 3. Kafka Connection Issues
```bash
# Check Kafka logs
docker-compose logs kafka

# Recreate topic
docker exec kafka kafka-topics --delete --topic transactions_raw --bootstrap-server localhost:9092
docker exec kafka kafka-topics --create --topic transactions_raw --partitions 1 --replication-factor 1 --bootstrap-server localhost:9092
```

#### 4. Pinot Not Receiving Data
```bash
# Check Pinot controller logs
docker-compose logs pinot-controller

# Check processor logs
tail -f logs/processor.log

# Verify consumer group
docker exec kafka kafka-consumer-groups --bootstrap-server localhost:9092 --group rt-processor-v1 --describe
```

#### 5. ML Model Not Loading
```bash
# Check if model exists
ls -la models/

# Retrain model
python3 scripts/train_and_export_mlflow.py

# Check API logs
tail -f logs/api.log
```

#### 6. Frontend Build Errors
```bash
cd website

# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run dev
```

#### 7. Database Connection Issues
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres

# Verify connection
docker exec -it postgres psql -U postgres -c "SELECT version();"
```

### View All Logs
```bash
# All Docker services
docker-compose logs -f

# All Python services
tail -f logs/*.log

# Specific service
tail -f logs/producer.log
tail -f logs/processor.log
tail -f logs/api.log
```

---

## Stopping Services

### Graceful Shutdown

```bash
# 1. Stop Next.js frontend
# Press Ctrl+C in the terminal running npm run dev

# 2. Stop Python processes
kill $(cat logs/producer.pid)
kill $(cat logs/processor.pid)
kill $(cat logs/ml_detector.pid)
kill $(cat logs/api.pid)
kill $(cat logs/pinot_exporter.pid)
kill $(cat logs/auto_ban_monitor.pid)
kill $(cat logs/segment_monitor.pid) 2>/dev/null || true

# 3. Stop Docker containers
docker-compose down

# To also remove volumes (WARNING: deletes all data)
# docker-compose down -v
```

### Quick Stop All
```bash
# Kill all Python processes
pkill -f "rt_producer.py"
pkill -f "rt_processor.py"
pkill -f "ml_fraud_detector.py"
pkill -f "uvicorn main:app"
pkill -f "pinot_exporter.py"
pkill -f "auto_ban_monitor.py"
pkill -f "segment_monitor.py"

# Stop Docker
docker-compose down

# Stop Node (if running in background)
pkill -f "next"
```

---

## Quick Start Script

For convenience, you can use this one-command startup:

```bash
#!/bin/bash
# save as: quick_start.sh

set -e

echo "Starting Realtime Pipeline Kafka-Pinot..."

# Start Docker services
echo "1. Starting Docker containers..."
docker-compose up -d
sleep 60

# Initialize database
echo "2. Initializing database..."
docker exec -i postgres psql -U postgres -d postgres < migrations/002_create_auth_tables.sql
docker exec -i postgres psql -U postgres -d postgres < migrations/003_create_transaction_users.sql
docker exec -i postgres psql -U postgres -d postgres < migrations/003_create_user_bans_table.sql
python3 scripts/create_transaction_users.py
python3 scripts/create_testing_user.py

# Setup Pinot
echo "3. Setting up Pinot..."
curl -X POST "http://localhost:9000/schemas" -H "Content-Type: application/json" -d @conf/transactions_schema.json
curl -X POST "http://localhost:9000/tables" -H "Content-Type: application/json" -d @conf/transactions_realtime_table.json
curl -X POST "http://localhost:9000/tables" -H "Content-Type: application/json" -d @conf/transactions_offline_table.json

# Start monitoring
echo "4. Starting monitoring..."
nohup python3 monitoring/pinot_exporter.py > logs/pinot_exporter.log 2>&1 &
echo $! > logs/pinot_exporter.pid

# Train initial model
echo "5. Training initial ML model..."
python3 scripts/train_and_export_mlflow.py

# Start backend
echo "6. Starting FastAPI backend..."
cd app
nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload > ../logs/api.log 2>&1 &
echo $! > ../logs/api.pid
cd ..
sleep 5

# Start data pipeline
echo "7. Starting data pipeline..."
cd crawl_data
nohup python3 rt_producer.py > ../logs/producer.log 2>&1 &
echo $! > ../logs/producer.pid
nohup python3 rt_processor.py > ../logs/processor.log 2>&1 &
echo $! > ../logs/processor.pid
nohup python3 ml_fraud_detector.py > ../logs/ml_detector.log 2>&1 &
echo $! > ../logs/ml_detector.pid
cd ..

# Start auto-ban
echo "8. Starting auto-ban monitor..."
nohup python3 -u scripts/auto_ban_monitor.py > logs/auto_ban_monitor.log 2>&1 &
echo $! > logs/auto_ban_monitor.pid

echo ""
echo "========================================="
echo "All services started successfully!"
echo "========================================="
echo ""
echo "Access points:"
echo "  Frontend:    http://localhost:3000"
echo "  API Docs:    http://localhost:8000/docs"
echo "  Pinot:       http://localhost:9000"
echo "  Grafana:     http://localhost:3001 (admin/admin)"
echo "  Prometheus:  http://localhost:9090"
echo "  MLflow:      http://localhost:5000"
echo ""
echo "Next step: Start the frontend manually"
echo "  cd website && npm run dev"
echo ""
echo "To stop all services, run: docker-compose down && pkill -f python3"
echo ""
```

Make it executable:
```bash
chmod +x quick_start.sh
./quick_start.sh
```

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT BROWSER                          │
│                   http://localhost:3000                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   NEXT.JS FRONTEND                          │
│                      (Port 3000)                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  FASTAPI BACKEND                            │
│                     (Port 8000)                             │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  PostgreSQL  │   │  Apache Pinot│   │    MLflow    │
│  (Port 5432) │   │  (Port 8099) │   │  (Port 5000) │
└──────────────┘   └──────────────┘   └──────────────┘
                            ▲
                            │
┌─────────────────────────────────────────────────────────────┐
│                    DATA PIPELINE                            │
│                                                             │
│  Producer → Kafka → Processor → Pinot                      │
│                     ML Detector → Labels                    │
│                     Auto-Ban → PostgreSQL                   │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │
┌─────────────────────────────────────────────────────────────┐
│                  MONITORING STACK                           │
│                                                             │
│  Pinot Exporter → Prometheus → Grafana                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Health Check Commands

```bash
# Quick health check all services
echo "=== Docker Containers ==="
docker-compose ps

echo -e "\n=== PostgreSQL ==="
docker exec postgres psql -U postgres -c "SELECT version();" 2>&1 | head -1

echo -e "\n=== Kafka ==="
docker exec kafka kafka-topics --list --bootstrap-server localhost:9092 2>&1 | head -3

echo -e "\n=== Pinot Tables ==="
curl -s "http://localhost:9000/tables" | python3 -m json.tool

echo -e "\n=== FastAPI ==="
curl -s "http://localhost:8000/health" | python3 -m json.tool

echo -e "\n=== Prometheus ==="
curl -s "http://localhost:9090/-/healthy"

echo -e "\n=== MLflow ==="
curl -s "http://localhost:5000/health"

echo -e "\n=== Transaction Count ==="
curl -X POST "http://localhost:8099/query/sql" \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT COUNT(*) FROM transactions"}' 2>&1 | python3 -m json.tool | grep -A 1 "resultTable"
```

---

## Performance Tuning

### For High-Volume Data

1. **Increase Kafka partitions**:
```bash
docker exec kafka kafka-topics --alter --topic transactions_raw --partitions 4 --bootstrap-server localhost:9092
```

2. **Adjust Pinot segment size** in `conf/transactions_realtime_table.json`:
```json
"segmentsConfig": {
  "replication": "1",
  "replicasPerPartition": "1",
  "segmentPushType": "APPEND",
  "completionConfig": {
    "completionMode": "DOWNLOAD"
  },
  "maxRowsInSegment": 10000  // Increase for larger segments
}
```

3. **Scale processors**:
```bash
# Run multiple processor instances
for i in {1..3}; do
  nohup python3 crawl_data/rt_processor.py > logs/processor_$i.log 2>&1 &
done
```

---

## Maintenance Tasks

### Daily Tasks
- Monitor logs: `tail -f logs/*.log`
- Check disk space: `df -h`
- Review Grafana dashboards

### Weekly Tasks
- Backup PostgreSQL database
- Review and clean old segments in Pinot
- Check MLflow model performance metrics

### Monthly Tasks
- Update dependencies
- Review and optimize queries
- Archive old data

---

## Support & Resources

- **Pinot Documentation**: https://docs.pinot.apache.org/
- **Kafka Documentation**: https://kafka.apache.org/documentation/
- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **Next.js Documentation**: https://nextjs.org/docs

---

**Version**: 1.0.0  
**Last Updated**: November 25, 2025  
**Maintainer**: NguyenKhanh1807
