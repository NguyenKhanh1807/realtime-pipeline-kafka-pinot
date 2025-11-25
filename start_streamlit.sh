#!/bin/bash

# Start Streamlit Data Ingestion Simulation

echo "Starting Streamlit Data Ingestion Simulation..."

# Install dependencies if needed
if ! python3 -c "import streamlit" 2>/dev/null; then
    echo "Installing Streamlit dependencies..."
    pip install -r streamlit_requirements.txt
fi

# Run streamlit
streamlit run streamlit_app.py --server.port 8501 --server.address 0.0.0.0
