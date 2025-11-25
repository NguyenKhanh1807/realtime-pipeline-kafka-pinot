#!/usr/bin/env python3
"""
Clean up old MLflow runs, keeping only the latest one.
"""

import requests
import sys

MLFLOW_URL = 'http://localhost:5000'

def get_experiment_id():
    """Get the fraud-detection experiment ID."""
    response = requests.post(
        f'{MLFLOW_URL}/api/2.0/mlflow/experiments/search',
        json={'max_results': 1, 'filter': "name = 'fraud-detection'"}
    )
    
    if response.status_code != 200:
        print(f"Error fetching experiments: {response.status_code}")
        return None
    
    data = response.json()
    if not data.get('experiments'):
        print("No fraud-detection experiment found")
        return None
    
    return data['experiments'][0]['experiment_id']

def get_all_runs(experiment_id):
    """Get all runs for the experiment."""
    response = requests.post(
        f'{MLFLOW_URL}/api/2.0/mlflow/runs/search',
        json={
            'experiment_ids': [experiment_id],
            'max_results': 1000,
            'order_by': ['start_time DESC']
        }
    )
    
    if response.status_code != 200:
        print(f"Error fetching runs: {response.status_code}")
        return []
    
    data = response.json()
    return data.get('runs', [])

def delete_run(run_id):
    """Delete a run by ID."""
    response = requests.post(
        f'{MLFLOW_URL}/api/2.0/mlflow/runs/delete',
        json={'run_id': run_id}
    )
    
    if response.status_code == 200:
        print(f"✓ Deleted run: {run_id}")
        return True
    else:
        print(f"✗ Failed to delete run {run_id}: {response.status_code}")
        return False

def main():
    print("Cleaning up old MLflow runs...")
    
    # Get experiment ID
    experiment_id = get_experiment_id()
    if not experiment_id:
        print("Could not find experiment ID")
        sys.exit(1)
    
    print(f"Experiment ID: {experiment_id}")
    
    # Get all runs
    runs = get_all_runs(experiment_id)
    print(f"Found {len(runs)} total runs")
    
    if len(runs) <= 1:
        print("Only one or no runs exist. Nothing to clean up.")
        return
    
    # Keep the latest (first) run, delete the rest
    latest_run = runs[0]
    old_runs = runs[1:]
    
    print(f"\nKeeping latest run: {latest_run['info']['run_id']}")
    print(f"  Started: {latest_run['info']['start_time']}")
    print(f"  Status: {latest_run['info']['status']}")
    
    print(f"\nDeleting {len(old_runs)} old runs...")
    
    deleted_count = 0
    for run in old_runs:
        run_id = run['info']['run_id']
        if delete_run(run_id):
            deleted_count += 1
    
    print(f"\n✓ Cleanup complete: Deleted {deleted_count} old runs")
    print(f"✓ Kept 1 latest run")

if __name__ == '__main__':
    main()
