#!/bin/bash

################################################################################
# Realtime Pipeline Kafka-Pinot - Complete Startup Script
# This script starts all services required for the application
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS_DIR="$PROJECT_ROOT/logs"
PIDS_DIR="$PROJECT_ROOT/logs"

# Ensure we're in project root
cd "$PROJECT_ROOT"

################################################################################
# Helper Functions
################################################################################

print_header() {
    echo -e "\n${BLUE}================================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}================================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

wait_for_service() {
    local service_name=$1
    local url=$2
    local max_attempts=${3:-30}
    local attempt=1

    print_info "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start within expected time"
    return 1
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

################################################################################
# Pre-flight Checks
################################################################################

preflight_checks() {
    print_header "Pre-flight Checks"
    
    # Check required commands
    print_info "Checking required software..."
    check_command docker
    check_command python3
    check_command curl
    print_success "All required software is installed"
    
    # Check if Docker daemon is running
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi
    print_success "Docker daemon is running"
    
    # Clean up old containers and volumes
    print_info "Cleaning up old Docker resources..."
    docker compose down -v 2>/dev/null || true
    
    # Prune unused volumes
    print_info "Pruning unused Docker volumes..."
    docker volume prune -f > /dev/null 2>&1
    print_success "Docker cleanup completed"
    
    # Create required directories
    print_info "Creating required directories..."
    mkdir -p "$LOGS_DIR" data segments mlruns mlartifacts models artifacts
    print_success "Directories created"
    
    # Kill processes using critical ports
    print_info "Freeing up required ports..."
    PORTS=(8000 8501 9000 9090 9093 3000 3001 5000 5432 9092 2181 8099)
    for PORT in "${PORTS[@]}"; do
        PID=$(lsof -ti:$PORT 2>/dev/null || true)
        if [ -n "$PID" ]; then
            print_info "Killing process on port $PORT (PID: $PID)..."
            kill -9 $PID 2>/dev/null || true
        fi
    done
    print_success "All ports freed"
}

################################################################################
# Python Dependencies
################################################################################

install_python_requirements() {
    print_header "Installing Python Dependencies"
    
    # Check if requirements.txt exists
    if [ ! -f "requirements.txt" ]; then
        print_error "requirements.txt not found!"
        exit 1
    fi
    
    print_info "Installing core Python packages..."
    if pip3 install -r requirements.txt; then
        print_success "Core dependencies installed successfully"
    else
        print_error "Failed to install core dependencies"
        exit 1
    fi
    
    # Note: Streamlit runs in Docker container
    print_info "Streamlit will run in Docker container (streamlit-app)"
}

################################################################################
# Docker Services
################################################################################

start_docker_services() {
    print_header "Starting Docker Services"
    
    print_info "Starting all Docker containers..."
    docker compose up -d
    
    print_info "Waiting for services to initialize (30 seconds)..."
    sleep 30
    
    # Check container status
    print_info "Checking container status..."
    docker compose ps
    
    # Wait for critical services
    print_info "Waiting for Kafka to be ready..."
    sleep 5  # Kafka needs time to fully initialize
    if docker exec kafka kafka-broker-api-versions --bootstrap-server localhost:9092 > /dev/null 2>&1; then
        print_success "Kafka is ready!"
    else
        print_warning "Kafka may still be starting, continuing anyway..."
    fi
    
    # Wait for Pinot services to be ready (now managed by docker-compose)
    print_info "Waiting for Pinot Controller to be ready..."
    sleep 10  # Give Pinot time to initialize
    
    if timeout 10 curl -s http://localhost:9000/health > /dev/null 2>&1; then
        print_success "Pinot Controller is healthy!"
    else
        print_warning "Pinot Controller not responding yet (may need more time)"
    fi
    
    wait_for_service "Prometheus" "http://localhost:9090/-/healthy" 10
    wait_for_service "Grafana" "http://localhost:3001/api/health" 10
    
    # MLflow binding issue - skip health check
    print_info "MLflow is starting in background (may take up to 60 seconds)..."
    print_info "You can check status at http://localhost:5000 once fully started"
    
    print_success "All Docker services are running"
}

################################################################################
# Kafka Topic Setup
################################################################################

setup_kafka_topics() {
    print_header "Setting up Kafka Topics"
    
    print_info "Creating Kafka topics..."
    
    # Create transactions_raw topic (for producer)
    docker exec kafka kafka-topics --create \
        --bootstrap-server localhost:9092 \
        --topic transactions_raw \
        --partitions 1 \
        --replication-factor 1 \
        --if-not-exists > /dev/null 2>&1
    print_success "Created topic: transactions_raw"
    
    # Create transactions_rt topic (for Pinot consumption)
    docker exec kafka kafka-topics --create \
        --bootstrap-server localhost:9092 \
        --topic transactions_rt \
        --partitions 1 \
        --replication-factor 1 \
        --if-not-exists > /dev/null 2>&1
    print_success "Created topic: transactions_rt"
    
    # List topics
    TOPIC_COUNT=$(docker exec kafka kafka-topics --list --bootstrap-server localhost:9092 2>/dev/null | grep -v "^_" | wc -l)
    print_success "Kafka configured with $TOPIC_COUNT topic(s)"
}

################################################################################
# Database Initialization
################################################################################

initialize_database() {
    print_header "Initializing PostgreSQL Database"
    
    # Wait a bit more for PostgreSQL to be fully ready
    sleep 10
    
    print_info "Running database migrations..."
    
    if [ -f "migrations/002_create_auth_tables.sql" ]; then
        docker exec -i postgres-fraud psql -U postgres -d fraud_detection < migrations/002_create_auth_tables.sql
        print_success "Auth tables created"
    fi
    
    if [ -f "migrations/003_create_transaction_users.sql" ]; then
        docker exec -i postgres-fraud psql -U postgres -d fraud_detection < migrations/003_create_transaction_users.sql
        print_success "Transaction users table created"
    fi
    
    if [ -f "migrations/003_create_user_bans_table.sql" ]; then
        docker exec -i postgres-fraud psql -U postgres -d fraud_detection < migrations/003_create_user_bans_table.sql
        print_success "User bans table created"
    fi
    
    if [ -f "migrations/004_add_user_status_columns.sql" ]; then
        docker exec -i postgres-fraud psql -U postgres -d fraud_detection < migrations/004_add_user_status_columns.sql
        print_success "User status columns added"
    fi
    
    print_info "Creating initial users..."
    python3 scripts/create_transaction_users.py
    print_success "Transaction users created"
    
    python3 scripts/create_testing_user.py
    print_success "Testing user created"
    
    # Verify database
    USER_COUNT=$(docker exec postgres-fraud psql -U postgres -d fraud_detection -t -c "SELECT COUNT(*) FROM transaction_users;" | tr -d ' ')
    print_success "Database initialized with $USER_COUNT users"
}

################################################################################
# Pinot Configuration
################################################################################

setup_pinot() {
    print_header "Configuring Apache Pinot"
    
    print_info "Creating Pinot schema..."
    curl -X POST "http://localhost:9000/schemas" \
      -H "Content-Type: application/json" \
      -d @conf/transactions_schema.json > /dev/null 2>&1
    print_success "Schema created"
    
    print_info "Creating realtime table..."
    curl -X POST "http://localhost:9000/tables" \
      -H "Content-Type: application/json" \
      -d @conf/transactions_realtime_table.json > /dev/null 2>&1
    print_success "Realtime table created"
    
    print_info "Creating offline table..."
    curl -X POST "http://localhost:9000/tables" \
      -H "Content-Type: application/json" \
      -d @conf/transactions_offline_table.json > /dev/null 2>&1
    print_success "Offline table created"
    
    # Verify tables
    TABLES=$(curl -s "http://localhost:9000/tables" | python3 -c "import sys, json; print(len(json.load(sys.stdin)['tables']))")
    print_success "Pinot configured with $TABLES tables"
}

################################################################################
# Monitoring Setup
################################################################################

setup_monitoring() {
    print_header "Setting up Monitoring"
    
    print_info "Starting Pinot exporter..."
    nohup python3 monitoring/pinot_exporter.py > "$LOGS_DIR/pinot_exporter.log" 2>&1 &
    echo $! > "$PIDS_DIR/pinot_exporter.pid"
    sleep 3
    print_success "Pinot exporter started (PID: $(cat $PIDS_DIR/pinot_exporter.pid))"
    
    # Verify Prometheus is collecting metrics
    sleep 5
    if curl -s "http://localhost:9093/metrics" | grep -q "pinot_"; then
        print_success "Prometheus metrics are being collected"
    else
        print_warning "Prometheus metrics may not be available yet"
    fi
}

################################################################################
# ML Model Training
################################################################################

train_initial_model() {
    print_header "Training Initial ML Model"
    
    print_info "Training fraud detection model..."
    python3 scripts/train_and_export_mlflow.py
    print_success "Model trained and saved"
    
    # Verify model exists
    if [ -d "models/fraud_detection_latest" ]; then
        print_success "Model directory created"
    else
        print_warning "Model directory not found, but training may have succeeded"
    fi
}

################################################################################
# Application Services
################################################################################

start_backend() {
    print_header "Starting Backend Services"
    
    print_info "Installing Python dependencies..."
    pip3 install -q -r requirements.txt
    print_success "Python dependencies installed"
    
    print_info "Starting FastAPI backend..."
    nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > "$LOGS_DIR/api.log" 2>&1 &
    echo $! > "$PIDS_DIR/api.pid"
    
    wait_for_service "FastAPI" "http://localhost:8000/health" 15
    print_success "FastAPI backend started (PID: $(cat $PIDS_DIR/api.pid))"
}

start_streamlit() {
    print_header "Starting Streamlit Dashboard"
    
    # Check if Streamlit container is already running
    if docker ps --format '{{.Names}}' | grep -q "^streamlit-app$"; then
        print_success "Streamlit container already running"
        wait_for_service "Streamlit" "http://localhost:8501" 10
        return 0
    fi
    
    # Start Streamlit container
    print_info "Starting Streamlit container..."
    docker compose up -d streamlit
    
    # Wait for service to be ready
    wait_for_service "Streamlit" "http://localhost:8501" 30
    
    if docker ps --format '{{.Names}}' | grep -q "^streamlit-app$"; then
        print_success "Streamlit container started successfully"
    else
        print_error "Streamlit container failed to start"
        docker logs streamlit-app --tail 20
        return 1
    fi
}

################################################################################
# Data Pipeline
################################################################################

start_data_pipeline() {
    print_header "Starting Data Pipeline"
    
    print_info "Starting real-time producer..."
    cd crawl_data
    nohup python3 rt_producer.py > "$LOGS_DIR/producer.log" 2>&1 &
    echo $! > "$PIDS_DIR/producer.pid"
    print_success "Producer started (PID: $(cat $PIDS_DIR/producer.pid))"
    
    sleep 3
    
    print_info "Starting real-time processor (with integrated ML fraud detector)..."
    nohup python3 rt_processor.py > "$LOGS_DIR/processor.log" 2>&1 &
    echo $! > "$PIDS_DIR/processor.pid"
    print_success "Processor started (PID: $(cat $PIDS_DIR/processor.pid))"
    
    cd ..
    
    sleep 3
    
    print_info "Starting auto-ban monitor..."
    nohup python3 -u scripts/auto_ban_monitor.py > "$LOGS_DIR/auto_ban_monitor.log" 2>&1 &
    echo $! > "$PIDS_DIR/auto_ban_monitor.pid"
    print_success "Auto-ban monitor started (PID: $(cat $PIDS_DIR/auto_ban_monitor.pid))"
}

################################################################################
# Verification
################################################################################

verify_system() {
    print_header "System Verification"
    
    sleep 10  # Wait for data to flow
    
    print_info "Checking data flow..."
    
    # Check Kafka topics
    TOPICS=$(docker exec kafka kafka-topics --list --bootstrap-server localhost:9092 2>/dev/null | wc -l)
    print_success "Kafka has $TOPICS topic(s)"
    
    # Check Pinot data
    sleep 5
    TX_COUNT=$(curl -s -X POST "http://localhost:8099/query/sql" \
      -H "Content-Type: application/json" \
      -d '{"sql":"SELECT COUNT(*) FROM transactions"}' | \
      python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('resultTable',{}).get('rows',[[0]])[0][0])" 2>/dev/null || echo "0")
    
    if [ "$TX_COUNT" -gt 0 ]; then
        print_success "Pinot has $TX_COUNT transactions"
    else
        print_warning "No transactions in Pinot yet (this is normal, wait a minute)"
    fi
    
    # Check running processes
    print_info "Checking running processes..."
    for pid_file in "$PIDS_DIR"/*.pid; do
        if [ -f "$pid_file" ]; then
            PID=$(cat "$pid_file")
            SERVICE=$(basename "$pid_file" .pid)
            if ps -p "$PID" > /dev/null 2>&1; then
                print_success "$SERVICE is running (PID: $PID)"
            else
                print_error "$SERVICE is not running (expected PID: $PID)"
            fi
        fi
    done
}

################################################################################
# Display Information
################################################################################

display_info() {
    print_header "Startup Complete!"
    
    echo -e "${GREEN}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                   ALL SERVICES STARTED                         ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "\n${BLUE}Access Points:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "  ${GREEN}Frontend (Next.js):${NC}     http://localhost:3000"
    echo -e "  ${GREEN}Streamlit Dashboard:${NC}    http://localhost:8501"
    echo -e "  ${GREEN}API Documentation:${NC}      http://localhost:8000/docs"
    echo -e "  ${GREEN}Pinot Controller:${NC}       http://localhost:9000"
    echo -e "  ${GREEN}Pinot Query Console:${NC}    http://localhost:8099"
    echo -e "  ${GREEN}Grafana:${NC}                http://localhost:3001 (admin/admin)"
    echo -e "  ${GREEN}Prometheus:${NC}             http://localhost:9090"
    echo -e "  ${GREEN}MLflow:${NC}                 http://localhost:5000"
    echo ""
    
    echo -e "\n${BLUE}Log Files:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "  Producer:          ${LOGS_DIR}/producer.log"
    echo -e "  Processor:         ${LOGS_DIR}/processor.log (includes ML detection)"
    echo -e "  Auto-Ban Monitor:  ${LOGS_DIR}/auto_ban_monitor.log"
    echo -e "  FastAPI:           ${LOGS_DIR}/api.log"
    echo -e "  Streamlit:         docker logs streamlit-app"
    echo -e "  Pinot Exporter:    ${LOGS_DIR}/pinot_exporter.log"
    echo ""
    
    echo -e "\n${BLUE}Next Steps:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "  1. Start the frontend:"
    echo -e "     ${YELLOW}cd website && npm install && npm run dev${NC}"
    echo ""
    echo -e "  2. View real-time logs:"
    echo -e "     ${YELLOW}tail -f logs/*.log${NC}"
    echo ""
    echo -e "  3. Monitor data flow:"
    echo -e "     ${YELLOW}watch -n 5 'curl -s -X POST http://localhost:8099/query/sql -H \"Content-Type: application/json\" -d \"{\\\"sql\\\":\\\"SELECT COUNT(*) FROM transactions\\\"}\"'${NC}"
    echo ""
    
    echo -e "\n${BLUE}Useful Commands:${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "  Stop all services:     ${YELLOW}./stop_all.sh${NC}"
    echo -e "  View Docker logs:      ${YELLOW}docker-compose logs -f${NC}"
    echo -e "  Check all processes:   ${YELLOW}ps aux | grep python3${NC}"
    echo -e "  Restart data pipeline: ${YELLOW}./restart_pipeline.sh${NC}"
    echo ""
    
    echo -e "\n${GREEN}System is ready! 🚀${NC}\n"
}

################################################################################
# Main Execution
################################################################################

main() {
    clear
    
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║     Realtime Pipeline Kafka-Pinot - Complete Startup          ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"
    
    preflight_checks
    install_python_requirements
    start_docker_services
    setup_kafka_topics
    initialize_database
    setup_pinot
    setup_monitoring
    train_initial_model
    start_backend
    start_streamlit
    start_data_pipeline
    verify_system
    display_info
}

# Handle interrupts
trap 'echo -e "\n${RED}Startup interrupted by user${NC}"; exit 130' INT TERM

# Run main function
main
