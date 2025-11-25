import streamlit as st
import requests
import time
import pandas as pd
from datetime import datetime
import os

# Backend API URL - use environment variable or default to localhost
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

# Page config
st.set_page_config(
    page_title="Data Ingestion Simulation",
    page_icon="📊",
    layout="wide"
)

# Title
st.title("📊 Real-time Data Ingestion Simulation")
st.markdown("Control and monitor transaction data generation into Kafka and Pinot")

# Sidebar controls
st.sidebar.header("⚙️ Ingestion Controls")

def get_status():
    """Get current producer status"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/data-generation/status", timeout=5)
        if response.ok:
            return response.json()
        return {"is_running": False, "error": "Failed to fetch status"}
    except Exception as e:
        return {"is_running": False, "error": str(e)}

def start_producer(config):
    """Start data generation"""
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/data-generation/start",
            json=config,
            timeout=10
        )
        return response.json()
    except Exception as e:
        return {"error": str(e)}

def stop_producer():
    """Stop data generation"""
    try:
        response = requests.post(f"{BACKEND_URL}/api/data-generation/stop", timeout=10)
        return response.json()
    except Exception as e:
        return {"error": str(e)}

# Get current status
status = get_status()
is_running = status.get("is_running", False)

# Status indicator
col1, col2, col3 = st.columns(3)

with col1:
    if is_running:
        st.success("🟢 Producer Running")
    else:
        st.error("🔴 Producer Stopped")

with col2:
    if is_running:
        st.metric("Process ID", status.get("process_id", "N/A"))
    else:
        st.metric("Process ID", "—")

with col3:
    if is_running and status.get("started_at"):
        st.metric("Started At", status.get("started_at", "N/A"))
    else:
        st.metric("Started At", "—")

st.divider()

# Configuration section
if not is_running:
    st.sidebar.subheader("🎛️ Configuration")
    
    simulation_mode = st.sidebar.selectbox(
        "Simulation Mode",
        ["auto", "peak", "normal", "low", "night"],
        help="auto=randomizes all settings | others=fixed patterns"
    )
    
    # Score range settings - always use predefined scores
    st.sidebar.markdown("**🎲 Fraud Score Range**")
    score_range = st.sidebar.slider(
        "Score Range (0-100)",
        min_value=0,
        max_value=100,
        value=(0, 100),
        help="Generate fraud scores within this range"
    )
    st.sidebar.info(f"Scores: {score_range[0]}-{score_range[1]}")
    
    # Historical data generation
    st.sidebar.markdown("**📅 Historical Data**")
    generate_historical = st.sidebar.checkbox(
        "Generate 1 week historical data",
        value=False,
        help="Generate random historical transactions for the past 7 days before starting real-time generation"
    )
    
    if generate_historical:
        st.sidebar.warning("⚠️ Will generate ~2-5 transactions/hour for 7 days (~350-840 total transactions)")
        historical_days = 7
    else:
        historical_days = 0
    
    # Show manual controls only if not in auto mode
    if simulation_mode != "auto":
        interval = st.sidebar.slider(
            "Interval (seconds)",
            min_value=1,
            max_value=30,
            value=2,
            help="Time between transaction batches"
        )
        
        start_sequence = st.sidebar.number_input(
            "Start Sequence",
            min_value=1,
            value=1,
            help="Starting transaction sequence number"
        )
    else:
        # Auto mode: randomize all settings
        st.sidebar.info("🎲 **Auto Mode Active**")
        st.sidebar.markdown("""
        All settings will be randomized:
        - Interval: 1-5 seconds
        - Start sequence: Random
        - Transaction amounts: $0-$1000
        """)
        
        import random
        interval = random.randint(1, 5)
        start_sequence = random.randint(1, 1000)
        
        st.sidebar.success(f"⚙️ Interval: {interval}s")
        st.sidebar.success(f"🔢 Start seq: {start_sequence}")
    
    if st.sidebar.button("▶️ Start Ingestion", type="primary", use_container_width=True):
        config = {
            "interval_seconds": interval,
            "simulation_mode": simulation_mode,
            "start_sequence": start_sequence,
            "historical_days": historical_days,
            "generate_with_scores": True,  # Always use predefined scores
            "use_ml_scoring": False,  # Disable ML scoring
            "score_min": score_range[0],
            "score_max": score_range[1],
            "topic_raw": "transactions_raw",
            "bootstrap_servers": "kafka:19092"  # Use Docker internal network
        }
        
        with st.spinner("Starting producer..."):
            result = start_producer(config)
            if "error" in result:
                st.error(f"❌ Failed to start: {result['error']}")
            else:
                st.success("✅ Producer started successfully!")
                st.success(f"🎲 Generating transactions with fraud scores ({score_range[0]}-{score_range[1]})")
                if historical_days and historical_days > 0:
                    st.info(f"📅 Generating {historical_days} days of historical data first...")
                time.sleep(1)
                st.rerun()
else:
    st.sidebar.info(f"**Mode:** {status.get('simulation_mode', 'auto')}")
    st.sidebar.info(f"**Interval:** {status.get('interval_seconds', 2)}s")
    st.sidebar.info(f"**Scores:** {status.get('score_min', 0)}-{status.get('score_max', 100)}")
    
    # Show historical data status if enabled
    historical_days = status.get('historical_days', 0) or 0
    if historical_days > 0:
        st.sidebar.info(f"**📅 Historical:** {historical_days} days")
    
    # Show fraud scoring method (always predefined scores now)
    
    if st.sidebar.button("⏹️ Stop Ingestion", type="secondary", use_container_width=True):
        with st.spinner("Stopping producer..."):
            result = stop_producer()
            if "error" in result:
                st.error(f"❌ Failed to stop: {result['error']}")
            else:
                st.success("✅ Producer stopped successfully!")
                time.sleep(1)
                st.rerun()

# Metrics section
st.header("📈 Ingestion Metrics")

if is_running:
    # Add stop button in main area for easy access
    col_stop1, col_stop2, col_stop3 = st.columns([2, 1, 2])
    with col_stop2:
        if st.button("⏹️ Stop Ingestion", type="secondary", use_container_width=True, key="main_stop"):
            with st.spinner("Stopping producer..."):
                result = stop_producer()
                if "error" in result:
                    st.error(f"❌ Failed to stop: {result['error']}")
                else:
                    st.success("✅ Producer stopped successfully!")
                    time.sleep(1)
                    st.rerun()
    
    st.divider()
    
    # Create placeholders for live updates
    metrics_placeholder = st.empty()
    chart_placeholder = st.empty()
    
    # Auto-refresh toggle
    auto_refresh = st.sidebar.checkbox("🔄 Auto-refresh (5s)", value=True)
    
    # Initialize session state for tracking metrics over time
    if 'metrics_history' not in st.session_state:
        st.session_state.metrics_history = []
    
    if auto_refresh:
        # Continuously refresh until producer stops or auto-refresh is disabled
        while True:
            status = get_status()
            
            # Break if producer stopped
            if not status.get("is_running"):
                st.info("Producer has stopped")
                time.sleep(2)
                st.rerun()
                break
            
            # Track metrics over time
            current_records = status.get("records_generated") or 0
            current_time = datetime.now()
            
            # Add to history
            st.session_state.metrics_history.append({
                'time': current_time,
                'records': current_records
            })
            
            # Keep only last 20 data points
            if len(st.session_state.metrics_history) > 20:
                st.session_state.metrics_history = st.session_state.metrics_history[-20:]
            
            # Display metrics
            with metrics_placeholder.container():
                col1, col2, col3, col4 = st.columns(4)
                
                with col1:
                    st.metric(
                        "Records Generated",
                        current_records
                    )
                
                with col2:
                    st.metric(
                        "Last Sequence",
                        status.get("last_sequence") or "—"
                    )
                
                with col3:
                    st.metric(
                        "Simulation Mode",
                        (status.get("simulation_mode") or "auto").upper()
                    )
                
                with col4:
                    uptime = "Running"
                    if status.get("started_at"):
                        try:
                            start_time = datetime.fromisoformat(status["started_at"].replace("Z", "+00:00"))
                            elapsed = datetime.now(start_time.tzinfo) - start_time
                            uptime = f"{int(elapsed.total_seconds() // 60)}m {int(elapsed.total_seconds() % 60)}s"
                        except Exception:
                            uptime = "Running"
                    st.metric("Uptime", uptime)
            
            # Transaction flow visualization
            with chart_placeholder.container():
                st.subheader("📊 Transaction Flow")
                
                if len(st.session_state.metrics_history) > 1:
                    # Create chart from actual metrics history
                    chart_data = pd.DataFrame(st.session_state.metrics_history)
                    chart_data['time'] = pd.to_datetime(chart_data['time'])
                    chart_data = chart_data.set_index('time')
                    st.line_chart(chart_data['records'])
                else:
                    st.info("📈 Collecting data... Chart will appear after a few updates")
            
            time.sleep(5)
    else:
        # Static display
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric(
                "Records Generated",
                status.get("records_generated", 0)
            )
        
        with col2:
            st.metric(
                "Last Sequence",
                status.get("last_sequence", "—")
            )
        
        with col3:
            st.metric(
                "Simulation Mode",
                (status.get("simulation_mode") or "auto").upper()
            )
        
        with col4:
            uptime = "Running"
            if status.get("started_at"):
                try:
                    start_time = datetime.fromisoformat(status["started_at"].replace("Z", "+00:00"))
                    elapsed = datetime.now(start_time.tzinfo) - start_time
                    uptime = f"{int(elapsed.total_seconds() // 60)}m {int(elapsed.total_seconds() % 60)}s"
                except Exception:
                    uptime = "Running"
            st.metric("Uptime", uptime)

else:
    st.info("👆 Start the ingestion to see live metrics")

# Information section
with st.expander("ℹ️ How it works"):
    st.markdown("""
    ### Data Flow
    
    1. **Producer** generates realistic transaction data
    2. **Kafka** receives data on `transactions_raw` topic
    3. **Processor** cleans and enriches the data
    4. **Kafka** forwards to `transactions_rt` topic
    5. **Pinot** ingests real-time data for analysis
    
    ### Simulation Modes
    
    - **auto**: 🎲 Randomizes everything (interval 1-5s, amounts $0-$1000, start sequence random)
    - **peak**: High transaction volume (rush hours)
    - **normal**: Moderate steady volume
    - **low**: Low activity period
    - **night**: Minimal activity (late night)
    
    ### Fraud Scoring
    
    - All transactions generated with **predefined fraud scores (0-100)**
    - Set custom score range to test different risk levels
    - Scores normalized to 0.0-1.0 for Pinot storage
    - Transaction patterns match score levels (high scores = suspicious patterns)
    
    ### Data Source
    
    - **1000 users** from **20 countries**
    - Realistic transaction patterns
    - Score-based fraud simulation
    """)

# Footer
st.sidebar.divider()
st.sidebar.caption("💡 Tip: Use 'auto' mode for realistic daily patterns")
st.sidebar.caption("🔗 Backend: http://localhost:8080")
