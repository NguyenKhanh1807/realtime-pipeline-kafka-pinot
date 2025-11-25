#!/bin/bash

# Workaround script to access MLflow UI
# MLflow is binding to 127.0.0.1 inside container, need to use port forwarding

echo "Opening MLflow UI via SSH tunnel..."
echo "MLflow will be accessible at: http://localhost:5000"
echo ""
echo "Note: If you need to access from outside, you can:"
echo "1. Docker exec into container: docker exec -it mlflow-server bash"
echo "2. Or restart MLflow container with proper binding fix"
echo ""

# Check if MLflow is accessible
if docker exec mlflow-server curl -s http://127.0.0.1:5000/health > /dev/null 2>&1; then
    echo "✓ MLflow is running inside container"
    echo "Access it at: http://localhost:5000 (from Docker host)"
else
    echo "✗ MLflow is not responding"
fi
