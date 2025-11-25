# Documentation Index

Complete documentation for the Real-time Fraud Detection Pipeline.

---

## 🚀 Getting Started

- **[README.md](../README.md)** - Project overview and quick start
- **[QUICK_START.md](../QUICK_START.md)** - Fast setup guide with common commands
- **[STARTUP_GUIDE.md](../STARTUP_GUIDE.md)** - Comprehensive step-by-step setup instructions

---

## 📚 Technical Documentation

### Core Systems

- **[ML_SYSTEM.md](ML_SYSTEM.md)** - Machine learning fraud detection system
  - Model architecture (XGBoost regression)
  - Training pipeline
  - MLflow integration
  - Auto-retrain system
  - Deployment and monitoring

- **[MONITORING.md](MONITORING.md)** - System monitoring and observability
  - Grafana dashboards
  - Prometheus metrics
  - Pinot performance monitoring
  - Custom exporters

### Features

- **[TRANSACTION_USERS.md](TRANSACTION_USERS.md)** - User management system
  - Database schema
  - User data generation
  - Real user integration

- **[USER_MANAGEMENT_ACTIONS.md](USER_MANAGEMENT_ACTIONS.md)** - Admin actions
  - Manual user status management
  - Ban/warning/restore operations
  - Database management UI

- **[DAILY_PATTERN_ANALYTICS.md](DAILY_PATTERN_ANALYTICS.md)** - Analytics features
  - Segment-based daily analysis
  - Pattern recognition
  - Time-series insights

- **[STREAMLIT_INGESTION.md](STREAMLIT_INGESTION.md)** - Data ingestion UI
  - Streamlit control interface
  - Simulation modes
  - Real-time monitoring

---

## 📖 Quick Reference

### Architecture
```
Producer → Kafka → Processor → Pinot (Realtime + Offline)
              ↓
        ML Detector → Auto-Ban System
              ↓
        PostgreSQL (Users + Bans)
              ↓
        FastAPI ← Next.js Frontend
              ↓
        Prometheus + Grafana
```

### Services & Ports

| Service | Port | Documentation |
|---------|------|---------------|
| Next.js Frontend | 3000 | [STARTUP_GUIDE.md](../STARTUP_GUIDE.md) |
| FastAPI Backend | 8000 | [STARTUP_GUIDE.md](../STARTUP_GUIDE.md) |
| Pinot Controller | 9000 | [MONITORING.md](MONITORING.md) |
| Pinot Broker | 8099 | [MONITORING.md](MONITORING.md) |
| Kafka | 9092 | [STARTUP_GUIDE.md](../STARTUP_GUIDE.md) |
| PostgreSQL | 5432 | [TRANSACTION_USERS.md](TRANSACTION_USERS.md) |
| Prometheus | 9090 | [MONITORING.md](MONITORING.md) |
| Grafana | 3001 | [MONITORING.md](MONITORING.md) |
| MLflow | 5000 | [ML_SYSTEM.md](ML_SYSTEM.md) |
| Streamlit | 8501 | [STREAMLIT_INGESTION.md](STREAMLIT_INGESTION.md) |

### Key Scripts

| Script | Purpose | Documentation |
|--------|---------|---------------|
| `startup.sh` | Start all services | [QUICK_START.md](../QUICK_START.md) |
| `stop_all.sh` | Stop all services | [QUICK_START.md](../QUICK_START.md) |
| `health_check.sh` | System health check | [QUICK_START.md](../QUICK_START.md) |
| `train_and_export_mlflow.py` | Train ML model | [ML_SYSTEM.md](ML_SYSTEM.md) |
| `segment_monitor.py` | Auto-retrain trigger | [ML_SYSTEM.md](ML_SYSTEM.md) |

---

## 🔍 Common Tasks

### Starting the System
```bash
./startup.sh
cd website && npm run dev
```
See [QUICK_START.md](../QUICK_START.md)

### Training ML Model
```bash
python3 scripts/train_and_export_mlflow.py
```
See [ML_SYSTEM.md](ML_SYSTEM.md)

### Monitoring Performance
- Grafana: http://localhost:3001 (admin/admin)
- Prometheus: http://localhost:9090
- MLflow: http://localhost:5000

See [MONITORING.md](MONITORING.md)

### Managing Users
- Database Management UI: http://localhost:3000/database-management
- Manual actions: Ban, warn, restore users

See [USER_MANAGEMENT_ACTIONS.md](USER_MANAGEMENT_ACTIONS.md)

---

## 🆘 Troubleshooting

See the **Troubleshooting** section in:
- [STARTUP_GUIDE.md](../STARTUP_GUIDE.md#troubleshooting) - General issues
- [ML_SYSTEM.md](ML_SYSTEM.md#troubleshooting) - ML model issues
- [MONITORING.md](MONITORING.md) - Monitoring stack issues

---

## 📝 Contributing

When adding new documentation:
1. Create `.md` files in the `docs/` folder
2. Update this index with links
3. Follow existing documentation structure
4. Include code examples where applicable

---

**Last Updated**: November 25, 2025
