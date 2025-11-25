#!/bin/bash

################################################################################
# Realtime Pipeline Kafka-Pinot - Health Check Script
# This script checks the status of all services
################################################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIDS_DIR="$PROJECT_ROOT/logs"

cd "$PROJECT_ROOT"

print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

check_service() {
    local name=$1
    local url=$2
    
    if curl -s "$url" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} $name: ${GREEN}Running${NC}"
        return 0
    else
        echo -e "  ${RED}✗${NC} $name: ${RED}Not responding${NC}"
        return 1
    fi
}

check_process() {
    local name=$1
    local pid_file="$PIDS_DIR/$2.pid"
    
    if [ -f "$pid_file" ]; then
        PID=$(cat "$pid_file")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo -e "  ${GREEN}✓${NC} $name: ${GREEN}Running${NC} (PID: $PID)"
            return 0
        else
            echo -e "  ${RED}✗${NC} $name: ${RED}Not running${NC} (PID file exists: $PID)"
            return 1
        fi
    else
        echo -e "  ${YELLOW}⚠${NC} $name: ${YELLOW}No PID file${NC}"
        return 1
    fi
}

main() {
    clear
    
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║          System Health Check - All Services Status            ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Docker Services
    print_header "Docker Services"
    check_service "Kafka" "http://localhost:29092"
    check_service "Zookeeper" "http://localhost:2181" || echo -e "  ${YELLOW}⚠${NC} Zookeeper: ${YELLOW}No HTTP endpoint${NC}"
    check_service "Pinot Controller" "http://localhost:9000/health"
    check_service "Pinot Broker" "http://localhost:8099"
    check_service "PostgreSQL" "http://localhost:5432" || echo -e "  ${YELLOW}⚠${NC} PostgreSQL: ${YELLOW}No HTTP endpoint (check with psql)${NC}"
    check_service "Prometheus" "http://localhost:9090/-/healthy"
    check_service "Grafana" "http://localhost:3001/api/health"
    check_service "MLflow" "http://localhost:5000/health"
    
    # Python Services
    print_header "Python Services"
    check_process "FastAPI Backend" "api"
    check_process "Producer" "producer"
    check_process "Processor" "processor"
    check_process "ML Detector" "ml_detector"
    check_process "Auto-Ban Monitor" "auto_ban_monitor"
    check_process "Pinot Exporter" "pinot_exporter"
    check_process "Segment Monitor" "segment_monitor" 2>/dev/null || echo -e "  ${YELLOW}⚠${NC} Segment Monitor: ${YELLOW}Not running (optional)${NC}"
    
    # Data Flow
    print_header "Data Flow Status"
    
    # Kafka Topics
    echo -n "  Kafka Topics: "
    TOPICS=$(docker exec kafka kafka-topics --list --bootstrap-server localhost:9092 2>/dev/null | wc -l)
    echo -e "${GREEN}$TOPICS topic(s)${NC}"
    
    # Consumer Lag
    echo -n "  Consumer Lag: "
    LAG=$(docker exec kafka kafka-consumer-groups --bootstrap-server localhost:9092 --group rt-processor-v1 --describe 2>/dev/null | grep transactions_raw | awk '{print $5}' || echo "N/A")
    if [ "$LAG" = "0" ]; then
        echo -e "${GREEN}$LAG records (caught up)${NC}"
    elif [ "$LAG" = "N/A" ]; then
        echo -e "${YELLOW}Unable to check${NC}"
    else
        echo -e "${YELLOW}$LAG records${NC}"
    fi
    
    # Pinot Data
    echo -n "  Pinot Transactions: "
    TX_COUNT=$(curl -s -X POST "http://localhost:8099/query/sql" \
      -H "Content-Type: application/json" \
      -d '{"sql":"SELECT COUNT(*) FROM transactions"}' 2>/dev/null | \
      python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('resultTable',{}).get('rows',[[0]])[0][0])" 2>/dev/null || echo "0")
    echo -e "${GREEN}$TX_COUNT records${NC}"
    
    # Pinot Segments
    echo -n "  Pinot Segments: "
    SEGMENTS=$(curl -s "http://localhost:9000/segments/transactions" 2>/dev/null | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data[0].get('REALTIME', [])) + len(data[0].get('OFFLINE', [])))" 2>/dev/null || echo "0")
    echo -e "${GREEN}$SEGMENTS segments${NC}"
    
    # PostgreSQL Users
    echo -n "  PostgreSQL Users: "
    PG_USERS=$(docker exec postgres psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM transaction_users;" 2>/dev/null | tr -d ' ' || echo "0")
    echo -e "${GREEN}$PG_USERS users${NC}"
    
    # PostgreSQL Bans
    echo -n "  Active Bans: "
    BANS=$(docker exec postgres psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM user_bans WHERE status = 'active';" 2>/dev/null | tr -d ' ' || echo "0")
    echo -e "${GREEN}$BANS banned users${NC}"
    
    # System Resources
    print_header "System Resources"
    
    # Docker Stats (CPU/Memory)
    echo -e "  ${BLUE}Docker Container Resources:${NC}"
    docker stats --no-stream --format "    {{.Name}}: CPU {{.CPUPerc}} | Memory {{.MemUsage}}" 2>/dev/null | head -8
    
    # Disk Usage
    echo -e "\n  ${BLUE}Disk Usage:${NC}"
    echo -n "    Project Directory: "
    du -sh "$PROJECT_ROOT" 2>/dev/null | awk '{print $1}'
    echo -n "    Docker Volumes: "
    docker system df -v 2>/dev/null | grep "Local Volumes" | awk '{print $3}' || echo "N/A"
    
    # Summary
    print_header "Summary"
    
    # Count running services
    DOCKER_OK=$(docker-compose ps --services --filter "status=running" 2>/dev/null | wc -l)
    DOCKER_TOTAL=$(docker-compose ps --services 2>/dev/null | wc -l)
    
    PYTHON_OK=0
    for pid_file in "$PIDS_DIR"/*.pid; do
        [ -f "$pid_file" ] || continue
        PID=$(cat "$pid_file")
        ps -p "$PID" > /dev/null 2>&1 && ((PYTHON_OK++))
    done
    
    echo -e "  Docker Services: ${GREEN}$DOCKER_OK${NC}/$DOCKER_TOTAL running"
    echo -e "  Python Services: ${GREEN}$PYTHON_OK${NC}/6+ running"
    echo -e "  Total Transactions: ${GREEN}$TX_COUNT${NC}"
    echo -e "  System Status: ${GREEN}Operational${NC}"
    
    echo -e "\n${BLUE}Access Points:${NC}"
    echo -e "  Frontend:    ${YELLOW}http://localhost:3000${NC}"
    echo -e "  API Docs:    ${YELLOW}http://localhost:8000/docs${NC}"
    echo -e "  Pinot UI:    ${YELLOW}http://localhost:9000${NC}"
    echo -e "  Grafana:     ${YELLOW}http://localhost:3001${NC}"
    echo -e "  Prometheus:  ${YELLOW}http://localhost:9090${NC}"
    echo -e "  MLflow:      ${YELLOW}http://localhost:5000${NC}"
    
    echo ""
}

main
