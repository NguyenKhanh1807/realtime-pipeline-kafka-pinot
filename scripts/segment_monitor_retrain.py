#!/usr/bin/env python3
"""
Monitor Pinot segments and trigger model retraining when segments are sealed.
Watches for realtime segments that transition to ONLINE (sealed) state.
"""

import requests
import time
import subprocess
import logging
from datetime import datetime
from typing import Dict, Set

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

PINOT_CONTROLLER = "http://localhost:9000"
PINOT_BROKER = "http://localhost:8099"
TABLE_NAME = "transactions"
TABLE_TYPE = "REALTIME"
CHECK_INTERVAL = 60  # Check every 60 seconds
MIN_RECORDS_FOR_RETRAIN = 500  # Minimum records before triggering retrain

# Track segments we've already processed
processed_segments: Set[str] = set()
last_retrain_time = None
last_record_count = 0


def get_table_segments() -> Dict:
    """Get all segments for the transactions table."""
    try:
        url = f"{PINOT_CONTROLLER}/segments/transactions_REALTIME"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        # Format: [{"REALTIME": ["seg1", "seg2", ...]}]
        # Extract segment names from nested structure
        segments = []
        if isinstance(data, list) and len(data) > 0:
            if isinstance(data[0], dict) and 'REALTIME' in data[0]:
                segments = data[0]['REALTIME']
        return {"segments": segments}
    except Exception as e:
        logger.error(f"Failed to fetch segments: {e}")
        return {}
        return {}


def get_segment_metadata(segment_name: str) -> Dict:
    """Get metadata for a specific segment."""
    try:
        url = f"{PINOT_CONTROLLER}/segments/{TABLE_NAME}/{TABLE_TYPE}/{segment_name}/metadata"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.debug(f"Failed to fetch metadata for {segment_name}: {e}")
        return {}


def get_table_size() -> int:
    """Get total number of records in the table."""
    try:
        query = "SELECT COUNT(*) FROM transactions"
        url = f"{PINOT_BROKER}/query/sql"
        response = requests.post(
            url,
            json={"sql": query},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        
        if data.get('resultTable') and data['resultTable'].get('rows'):
            return int(data['resultTable']['rows'][0][0])
        return 0
    except Exception as e:
        logger.error(f"Failed to get table size: {e}")
        return 0


def trigger_model_retrain():
    """Trigger the model retraining script."""
    global last_retrain_time
    
    try:
        logger.info("=" * 60)
        logger.info("TRIGGERING MODEL RETRAINING")
        logger.info("=" * 60)
        
        # Run the training script
        result = subprocess.run(
            ["python3", "/Users/nguyenthanh/Master/DataEngineering/final/realtime-pipeline-kafka-pinot-final/scripts/train_fraud_model.py"],
            capture_output=True,
            text=True,
            timeout=600  # 10 minute timeout
        )
        
        if result.returncode == 0:
            logger.info("✓ Model retraining completed successfully")
            last_retrain_time = datetime.now()
            
            # Log last few lines of output
            output_lines = result.stdout.strip().split('\n')
            logger.info("Training output (last 10 lines):")
            for line in output_lines[-10:]:
                logger.info(f"  {line}")
        else:
            logger.error(f"✗ Model retraining failed with code {result.returncode}")
            logger.error(f"Error output: {result.stderr[:500]}")
            
    except subprocess.TimeoutExpired:
        logger.error("Model retraining timed out after 10 minutes")
    except Exception as e:
        logger.error(f"Failed to trigger model retraining: {e}")


def check_for_new_sealed_segments():
    """Check for newly sealed segments and trigger retraining if needed."""
    global last_record_count
    
    segments_data = get_table_segments()
    
    if not segments_data or 'segments' not in segments_data:
        logger.debug("No segment data available")
        return
    
    segments = segments_data.get('segments', [])
    
    # Count newly detected segments (assume all new ones are sealed except the last one)
    new_sealed_segments = []
    
    # Sort segments to identify the last one (currently consuming)
    sorted_segments = sorted(segments)
    
    for segment_name in sorted_segments[:-1]:  # Exclude the last segment (likely consuming)
        # Skip if we've already processed this segment
        if segment_name in processed_segments:
            continue
        
        # This is a new sealed segment
        new_sealed_segments.append({
            'name': segment_name,
        })
        processed_segments.add(segment_name)
        logger.info(f"New sealed segment detected: {segment_name}")
    
    # Check total record count
    current_record_count = get_table_size()
    record_increase = current_record_count - last_record_count
    
    if new_sealed_segments:
        logger.info(f"Found {len(new_sealed_segments)} new sealed segment(s)")
        logger.info(f"Total records in table: {current_record_count:,}")
        logger.info(f"Record increase since last check: {record_increase:,}")
        
        # Trigger retraining if we have enough new data
        if record_increase >= MIN_RECORDS_FOR_RETRAIN:
            time_since_last_retrain = None
            if last_retrain_time:
                time_since_last_retrain = (datetime.now() - last_retrain_time).total_seconds() / 60
                logger.info(f"Time since last retrain: {time_since_last_retrain:.1f} minutes")
            
            # Don't retrain too frequently (at least 5 minutes between retrains)
            if last_retrain_time is None or time_since_last_retrain > 5:
                trigger_model_retrain()
                last_record_count = current_record_count
            else:
                logger.info(f"Skipping retrain - last retrain was {time_since_last_retrain:.1f} minutes ago")
        else:
            logger.info(f"Not enough new records for retrain (need {MIN_RECORDS_FOR_RETRAIN}, got {record_increase})")
            last_record_count = current_record_count


def main():
    """Main monitoring loop."""
    logger.info("=" * 60)
    logger.info("PINOT SEGMENT MONITOR & AUTO-RETRAIN SERVICE")
    logger.info("=" * 60)
    logger.info(f"Monitoring table: {TABLE_NAME}")
    logger.info(f"Check interval: {CHECK_INTERVAL} seconds")
    logger.info(f"Segment flush threshold: 1000 records")
    logger.info(f"Min records for retrain: {MIN_RECORDS_FOR_RETRAIN}")
    logger.info("=" * 60)
    
    # Get initial state
    global last_record_count
    last_record_count = get_table_size()
    logger.info(f"Initial table size: {last_record_count:,} records")
    
    # Load existing segments into processed set
    segments_data = get_table_segments()
    if segments_data and 'segments' in segments_data:
        for segment_name in segments_data['segments']:
            if segment_name:
                processed_segments.add(segment_name)
        logger.info(f"Tracking {len(processed_segments)} existing segments")
    
    logger.info("Starting monitoring loop...")
    
    try:
        while True:
            check_for_new_sealed_segments()
            time.sleep(CHECK_INTERVAL)
    except KeyboardInterrupt:
        logger.info("\n" + "=" * 60)
        logger.info("Monitoring stopped by user")
        logger.info(f"Processed {len(processed_segments)} segments total")
        if last_retrain_time:
            logger.info(f"Last retrain: {last_retrain_time.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("=" * 60)


if __name__ == "__main__":
    main()
