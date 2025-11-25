# Quick Start Guide

## 🚀 One-Command Startup

```bash
./startup.sh
```

This will:
- ✅ Start all Docker containers (Kafka, Pinot, PostgreSQL, Prometheus, Grafana, MLflow)
- ✅ Initialize database with users and tables
- ✅ Configure Apache Pinot with schema and tables
- ✅ Train initial ML fraud detection model
- ✅ Start all backend services (API, producer, processor, ML detector, auto-ban)
- ✅ Setup monitoring (Prometheus exporter)
- ✅ Verify everything is working

**Time**: ~3-5 minutes

---

## 🖥️ Start Frontend (Manual)

After `startup.sh` completes:

```bash
cd website
npm install   # First time only
npm run dev
```

Access: **http://localhost:3000**

---

## 📊 Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | test user from DB |
| **API Docs** | http://localhost:8000/docs | - |
| **Pinot UI** | http://localhost:9000 | - |
| **Grafana** | http://localhost:3001 | admin / admin |
| **Prometheus** | http://localhost:9090 | - |
| **MLflow** | http://localhost:5000 | - |

---

## 🔍 Check System Health

```bash
./health_check.sh
```

This shows:
- ✅ All service statuses
- ✅ Data flow metrics
- ✅ System resources
- ✅ Transaction counts

---

## 🛑 Stop Everything

```bash
./stop_all.sh
```

Gracefully stops:
- All Python services
- All Docker containers
- Cleans up PID files

---

## 📝 View Logs

```bash
# All logs
tail -f logs/*.log

# Specific service
tail -f logs/producer.log
tail -f logs/processor.log
tail -f logs/api.log
```

---

## 🔧 Common Commands

### Check Transaction Count
```bash
curl -X POST "http://localhost:8099/query/sql" \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT COUNT(*) FROM transactions"}'
```

### Check Consumer Lag
```bash
docker exec kafka kafka-consumer-groups --bootstrap-server localhost:9092 \
  --group rt-processor-v1 --describe
```

### View Recent Transactions
```bash
curl -X POST "http://localhost:8099/query/sql" \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT * FROM transactions ORDER BY create_dt DESC LIMIT 5"}'
```

### Check Database Users
```bash
docker exec -it postgres psql -U postgres -d postgres -c "SELECT COUNT(*) FROM transaction_users;"
```

---

## 🆘 Troubleshooting

### Services Won't Start
```bash
# Check port conflicts
sudo lsof -i :3000  # Frontend
sudo lsof -i :8000  # API
sudo lsof -i :9092  # Kafka

# Kill conflicting process
kill -9 <PID>
```

### Reset Everything
```bash
./stop_all.sh
docker-compose down -v  # ⚠️ Deletes all data
./startup.sh
```

### Producer/Processor Not Working
```bash
# Restart data pipeline
pkill -f rt_producer.py
pkill -f rt_processor.py

cd crawl_data
nohup python3 rt_producer.py > ../logs/producer.log 2>&1 &
nohup python3 rt_processor.py > ../logs/processor.log 2>&1 &
cd ..
```

---

## 📚 Full Documentation

See **[STARTUP_GUIDE.md](STARTUP_GUIDE.md)** for comprehensive documentation including:
- Prerequisites
- Manual setup steps
- Configuration options
- Performance tuning
- Maintenance tasks

---

## 🎯 Typical Workflow

1. **Initial Setup** (First time only)
   ```bash
   git clone <repo>
   cd realtime-pipeline-kafka-pinot
   ./startup.sh
   cd website && npm install && npm run dev
   ```

2. **Daily Use**
   ```bash
   ./startup.sh          # Start backend
   cd website && npm run dev  # Start frontend
   ```

3. **Check Status**
   ```bash
   ./health_check.sh
   ```

4. **Stop Work**
   ```bash
   ./stop_all.sh
   # Ctrl+C in frontend terminal
   ```

---

## 🔥 Quick Test

After startup, verify data is flowing:

```bash
# Wait 2 minutes for data generation
sleep 120

# Check transaction count (should be > 0)
curl -s -X POST "http://localhost:8099/query/sql" \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT COUNT(*) FROM transactions"}' | python3 -m json.tool

# Check fraud detection (should show label distribution)
curl -s -X POST "http://localhost:8099/query/sql" \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT label, COUNT(*) as count FROM transactions GROUP BY label"}' | python3 -m json.tool
```

Expected output:
- label 0 (normal): ~70-80% of transactions
- label 1 (warning): ~10-15% of transactions  
- label 2 (banned): ~10-15% of transactions

---

## 📞 Support

- GitHub Issues: https://github.com/NguyenKhanh1807/realtime-pipeline-kafka-pinot/issues
- Documentation: See `/docs` folder

---

**Version**: 1.0.0  
**Last Updated**: November 25, 2025
