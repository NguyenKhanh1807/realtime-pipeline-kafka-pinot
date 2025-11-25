#!/bin/bash

# Start Streamlit Data Ingestion Simulation (Docker Container)

echo "Starting Streamlit container..."

# Stop existing container if running
docker compose stop streamlit 2>/dev/null || true

# Start Streamlit container
docker compose up -d streamlit

# Wait for service to be ready
echo "Waiting for Streamlit to start..."
sleep 5

# Check if container is running
if docker ps --format '{{.Names}}' | grep -q "^streamlit-app$"; then
    echo "✓ Streamlit container started successfully"
    echo ""
    echo "Access Streamlit at: http://localhost:8501"
    echo "View logs with: docker logs -f streamlit-app"
else
    echo "✗ Failed to start Streamlit container"
    docker logs streamlit-app --tail 20
    exit 1
fi
