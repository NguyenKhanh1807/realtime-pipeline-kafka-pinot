#!/bin/bash

################################################################################
# Realtime Pipeline Kafka-Pinot - Complete Shutdown Script
# This script stops all services gracefully
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIDS_DIR="$PROJECT_ROOT/logs"

cd "$PROJECT_ROOT"

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

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

stop_python_services() {
    print_header "Stopping Python Services"
    
    # Stop services by PID files
    for pid_file in "$PIDS_DIR"/*.pid; do
        if [ -f "$pid_file" ]; then
            PID=$(cat "$pid_file")
            SERVICE=$(basename "$pid_file" .pid)
            
            if ps -p "$PID" > /dev/null 2>&1; then
                print_info "Stopping $SERVICE (PID: $PID)..."
                kill "$PID" 2>/dev/null || true
                sleep 2
                
                # Force kill if still running
                if ps -p "$PID" > /dev/null 2>&1; then
                    kill -9 "$PID" 2>/dev/null || true
                    print_success "$SERVICE force stopped"
                else
                    print_success "$SERVICE stopped gracefully"
                fi
            else
                print_info "$SERVICE was not running"
            fi
            
            rm -f "$pid_file"
        fi
    done
    
    # Kill any remaining Python processes
    print_info "Checking for remaining Python processes..."
    pkill -f "rt_producer.py" 2>/dev/null || true
    pkill -f "rt_processor.py" 2>/dev/null || true
    pkill -f "ml_fraud_detector.py" 2>/dev/null || true
    pkill -f "uvicorn main:app" 2>/dev/null || true
    pkill -f "pinot_exporter.py" 2>/dev/null || true
    pkill -f "auto_ban_monitor.py" 2>/dev/null || true
    pkill -f "segment_monitor.py" 2>/dev/null || true
    
    print_success "All Python services stopped"
}

stop_docker_services() {
    print_header "Stopping Docker Services"
    
    print_info "Stopping Docker containers..."
    docker compose down
    
    print_success "Docker containers stopped"
}

cleanup() {
    print_header "Cleanup"
    
    # Remove PID files
    print_info "Removing PID files..."
    rm -f "$PIDS_DIR"/*.pid
    print_success "PID files removed"
}

display_final_message() {
    print_header "Shutdown Complete"
    
    echo -e "${GREEN}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║              ALL SERVICES STOPPED SUCCESSFULLY                 ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"
    
    echo -e "${BLUE}To start services again, run:${NC}"
    echo -e "  ${YELLOW}./startup.sh${NC}\n"
    
    echo -e "${BLUE}To remove all data (including Docker volumes), run:${NC}"
    echo -e "  ${YELLOW}docker-compose down -v${NC}\n"
}

main() {
    clear
    
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║     Realtime Pipeline Kafka-Pinot - Complete Shutdown         ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"
    
    stop_python_services
    stop_docker_services
    cleanup
    display_final_message
}

# Handle interrupts
trap 'echo -e "\n${RED}Shutdown interrupted by user${NC}"; exit 130' INT TERM

# Run main function
main
