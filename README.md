# Real-time Fraud Detection Pipeline with Apache Pinot & Kafka

A comprehensive **real-time fraud detection system** built with Apache Pinot, Kafka, FastAPI, and Next.js. This project demonstrates a complete data pipeline from generation to visualization, featuring ML-based fraud detection, auto-ban system, and real-time monitoring.

## ⚡ Quick Start

**Note: Using Docker v2**
**One-command startup:**
```bash
./startup.sh
```

Then start the frontend:
```bash
cd website && npm install && npm run dev
```

**Access**: http://localhost:3000

See **[QUICK_START.md](QUICK_START.md)** for details.

---

## 🏗️ Architecture

```
Producer → Kafka → Processor → Pinot (Real-time + Offline Tables)
                      ↓
                ML Detector → Auto-Ban System
                      ↓
              PostgreSQL (Users + Bans)
                      ↓
         FastAPI Backend → Next.js Frontend
                      ↓
         Prometheus + Grafana (Monitoring)
```

---

## 📚 Complete Documentation

- **[QUICK_START.md](QUICK_START.md)** - Fast setup and common commands
- **[STARTUP_GUIDE.md](STARTUP_GUIDE.md)** - Comprehensive setup guide
- **[API_QUICK_REFERENCE.md](API_QUICK_REFERENCE.md)** - API documentation
- **[docs/](docs/)** - Technical documentation

---

## 🚀 Features

- ✅ **Real-time Data Pipeline**: Kafka → Pinot streaming ingestion
- ✅ **ML Fraud Detection**: Auto-classify transactions (normal/warning/banned)
- ✅ **Auto-Ban System**: Automatic user blocking based on fraud patterns
- ✅ **Hybrid Tables**: Realtime + Offline Pinot tables with automatic tiering
- ✅ **Live Dashboard**: Real-time metrics and visualizations
- ✅ **Monitoring Stack**: Prometheus + Grafana for system metrics
- ✅ **MLflow Integration**: Model versioning and experiment tracking
- ✅ **RESTful API**: FastAPI backend with Swagger docs

---

## 🛠️ Technology Stack

### Backend
- **Apache Pinot** - OLAP datastore for real-time analytics
- **Apache Kafka** - Event streaming platform
- **PostgreSQL** - Relational database for users and bans
- **FastAPI** - Modern Python web framework
- **MLflow** - ML lifecycle management

### Frontend
- **Next.js 14** - React framework with App Router
- **TailwindCSS** - Utility-first CSS framework
- **Recharts** - Charting library for visualizations

### Monitoring
- **Prometheus** - Metrics collection
- **Grafana** - Metrics visualization
- **Custom Exporters** - Pinot and Kafka metrics

### ML/Data Processing
- **scikit-learn** - Machine learning
- **pandas** - Data manipulation
- **NumPy** - Numerical computing

---

## 📋 Prerequisites

- **Docker** & **Docker Compose** (v2.0+)
- **Python** 3.8+
- **Node.js** 18+
- **8GB RAM** minimum (16GB recommended)

---

## 🔧 Services & Ports

| Service | Port | Description |
|---------|------|-------------|
| Next.js Frontend | 3000 | Web UI |
| FastAPI Backend | 8000 | REST API |
| Pinot Controller | 9000 | Pinot admin UI |
| Pinot Broker | 8099 | Query endpoint |
| Pinot Server | 8097-8098 | Data serving |
| Kafka | 9092, 29092 | Message broker |
| Zookeeper | 2181 | Kafka coordination |
| PostgreSQL | 5432 | Relational database |
| Prometheus | 9090 | Metrics server |
| Grafana | 3001 | Monitoring dashboards |
| MLflow | 5000 | ML tracking |
| Pinot Exporter | 9093 | Prometheus metrics |

---

## 📖 Manual Setup

For manual step-by-step setup instructions, see **[STARTUP_GUIDE.md](STARTUP_GUIDE.md)**.

---

## 🎯 Key Commands

```bash
# Start all services
./startup.sh

# Check system health
./health_check.sh

# Stop all services
./stop_all.sh

# View logs
tail -f logs/*.log
```

---

## 📊 Access Points

Once started, access the application at:

- **Frontend Dashboard**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs
- **Pinot Controller**: http://localhost:9000
- **Grafana Monitoring**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **MLflow**: http://localhost:5000

---

## 🔍 System Health

Check that everything is running:

```bash
./health_check.sh
```

This displays:
- ✅ Docker container status
- ✅ Python services status
- ✅ Data flow metrics
- ✅ System resources

---

## 🛠️ Troubleshooting

### Services won't start
```bash
# Check port conflicts
sudo lsof -i :PORT_NUMBER

# Reset everything
./stop_all.sh
docker-compose down -v  # ⚠️ Deletes all data
./startup.sh
```

### No data in Pinot
```bash
# Check producer
tail -f logs/producer.log

# Check processor
tail -f logs/processor.log

# Check Kafka consumer lag
docker exec kafka kafka-consumer-groups --bootstrap-server localhost:9092 \
  --group rt-processor-v1 --describe
```

For more troubleshooting, see **[STARTUP_GUIDE.md](STARTUP_GUIDE.md)**.

---

## 📝 License

MIT License

---

## 👥 Contributors

**Maintainer**: Group 9

---

**Version**: 1.0.0  
**Last Updated**: November 25, 2025

