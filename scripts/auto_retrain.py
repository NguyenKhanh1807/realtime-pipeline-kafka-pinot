#!/usr/bin/env python3
"""
Auto-retraining service that monitors transaction count and triggers model retraining.
Runs every hour and checks if there are 500+ new transactions since last training.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import time
import requests
import json
from datetime import datetime
from apscheduler.schedulers.blocking import BlockingScheduler
import subprocess
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
PINOT_URL = "http://localhost:8099/query/sql"
MIN_NEW_TRANSACTIONS = 500
CHECK_INTERVAL_HOURS = 1
STATE_FILE = "data/retrain_state.json"

class RetrainingMonitor:
    def __init__(self):
        self.state = self.load_state()
        
    def load_state(self):
        """Load last training state from file."""
        if os.path.exists(STATE_FILE):
            with open(STATE_FILE, 'r') as f:
                return json.load(f)
        return {
            'last_training_time': None,
            'last_transaction_count': 0,
            'total_retrains': 0
        }
    
    def save_state(self):
        """Save training state to file."""
        os.makedirs(os.path.dirname(STATE_FILE), exist_ok=True)
        with open(STATE_FILE, 'w') as f:
            json.dump(self.state, f, indent=2)
        logger.info(f"State saved: {self.state}")
    
    def get_transaction_count(self):
        """Get total transaction count from Pinot."""
        try:
            query = {
                "sql": "SELECT COUNT(*) as total FROM transactions"
            }
            response = requests.post(PINOT_URL, json=query, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                rows = result.get('resultTable', {}).get('rows', [])
                if rows:
                    return int(rows[0][0])
            
            logger.error(f"Failed to query Pinot: {response.status_code}")
            return None
            
        except Exception as e:
            logger.error(f"Error querying Pinot: {e}")
            return None
    
    def get_fraud_count(self):
        """Get fraud transaction count from Pinot."""
        try:
            query = {
                "sql": "SELECT COUNT(*) as fraud_count FROM transactions WHERE label = 1"
            }
            response = requests.post(PINOT_URL, json=query, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                rows = result.get('resultTable', {}).get('rows', [])
                if rows:
                    return int(rows[0][0])
            return 0
            
        except Exception as e:
            logger.error(f"Error querying fraud count: {e}")
            return 0
    
    def should_retrain(self, current_count):
        """Check if retraining is needed."""
        if current_count is None:
            return False
        
        last_count = self.state['last_transaction_count']
        new_transactions = current_count - last_count
        
        logger.info(f"Current: {current_count}, Last: {last_count}, New: {new_transactions}")
        
        if new_transactions >= MIN_NEW_TRANSACTIONS:
            logger.info(f"✓ Retraining threshold reached: {new_transactions} >= {MIN_NEW_TRANSACTIONS}")
            return True
        
        logger.info(f"Threshold not reached: {new_transactions}/{MIN_NEW_TRANSACTIONS}")
        return False
    
    def trigger_retraining(self):
        """Trigger the training script."""
        logger.info("="*60)
        logger.info("TRIGGERING MODEL RETRAINING")
        logger.info("="*60)
        
        try:
            # Get fraud count
            fraud_count = self.get_fraud_count()
            
            if fraud_count == 0:
                logger.warning("No fraud cases in database - skipping retraining")
                logger.info("Model needs labeled fraud examples to learn patterns")
                return False
            
            logger.info(f"Found {fraud_count} fraud cases - proceeding with training")
            
            # Run training script
            script_path = os.path.join(
                os.path.dirname(os.path.abspath(__file__)),
                "train_fraud_model.py"
            )
            
            logger.info(f"Executing: python {script_path}")
            
            result = subprocess.run(
                [sys.executable, script_path],
                capture_output=True,
                text=True,
                timeout=600  # 10 minute timeout
            )
            
            if result.returncode == 0:
                logger.info("✓ Training completed successfully")
                logger.info("Training output:")
                for line in result.stdout.split('\n')[-20:]:  # Last 20 lines
                    if line.strip():
                        logger.info(f"  {line}")
                
                # Update state
                current_count = self.get_transaction_count()
                self.state['last_training_time'] = datetime.now().isoformat()
                self.state['last_transaction_count'] = current_count
                self.state['total_retrains'] += 1
                self.save_state()
                
                return True
            else:
                logger.error(f"✗ Training failed with code {result.returncode}")
                logger.error(f"Error output:\n{result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            logger.error("✗ Training timed out after 10 minutes")
            return False
        except Exception as e:
            logger.error(f"✗ Error during training: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def check_and_retrain(self):
        """Main check and retrain logic."""
        logger.info("\n" + "="*60)
        logger.info("AUTO-RETRAIN CHECK")
        logger.info("="*60)
        logger.info(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        current_count = self.get_transaction_count()
        
        if current_count is None:
            logger.error("Cannot determine transaction count - skipping check")
            return
        
        logger.info(f"Total transactions: {current_count}")
        logger.info(f"Last trained at: {self.state.get('last_training_time', 'Never')}")
        logger.info(f"Total retrains: {self.state['total_retrains']}")
        
        if self.should_retrain(current_count):
            success = self.trigger_retraining()
            if success:
                logger.info("✓ Retraining cycle completed successfully")
            else:
                logger.warning("✗ Retraining cycle failed")
        else:
            logger.info("No retraining needed at this time")

def main():
    """Run the auto-retraining monitor."""
    logger.info("="*60)
    logger.info("FRAUD MODEL AUTO-RETRAINING SERVICE")
    logger.info("="*60)
    logger.info(f"Check interval: Every {CHECK_INTERVAL_HOURS} hour(s)")
    logger.info(f"Retrain threshold: {MIN_NEW_TRANSACTIONS} new transactions")
    logger.info(f"State file: {STATE_FILE}")
    logger.info("="*60)
    
    monitor = RetrainingMonitor()
    
    # Run initial check
    logger.info("\nRunning initial check...")
    monitor.check_and_retrain()
    
    # Schedule periodic checks
    scheduler = BlockingScheduler()
    scheduler.add_job(
        monitor.check_and_retrain,
        'interval',
        hours=CHECK_INTERVAL_HOURS,
        id='retrain_check',
        name='Check if model retraining is needed'
    )
    
    logger.info(f"\n✓ Scheduler started - checking every {CHECK_INTERVAL_HOURS} hour(s)")
    logger.info("Press Ctrl+C to stop\n")
    
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("\n✓ Scheduler stopped")

if __name__ == "__main__":
    main()
