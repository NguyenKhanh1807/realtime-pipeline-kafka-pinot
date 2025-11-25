"""
Data Generation Controller API endpoints.
"""

import subprocess
import os
import signal
import psutil
import json
import time
from datetime import datetime
from typing import Dict, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

router = APIRouter()

class DataGenerationStatus(BaseModel):
    is_running: bool
    process_id: Optional[int] = None
    started_at: Optional[str] = None
    records_generated: Optional[int] = None
    last_sequence: Optional[int] = None
    simulation_mode: Optional[str] = None
    interval_seconds: Optional[int] = None
    historical_days: Optional[int] = None
    use_ml_scoring: Optional[bool] = None
    generate_with_scores: Optional[bool] = None

class DataGenerationConfig(BaseModel):
    interval_seconds: int = 2
    topic_raw: str = "transactions_raw"
    bootstrap_servers: str = "localhost:9092"
    start_sequence: int = 1
    simulation_mode: str = "auto"  # auto, peak, normal, low, night
    historical_days: int = 0  # Generate historical data for N days (0=realtime only)
    generate_with_scores: bool = False  # Generate with predefined fraud scores (0-100)
    use_ml_scoring: bool = True  # Use ML fraud detection (True) or rule-based only (False)
    score_min: int = 0  # Minimum fraud score (0-100)
    score_max: int = 100  # Maximum fraud score (0-100)

# In-memory store for process tracking (in production, use Redis or database)
_process_store: Dict[str, Dict] = {}
# Track recently stopped processes to avoid re-tracking them immediately
_recently_stopped: Dict[int, float] = {}

def get_producer_script_path() -> str:
    """Get the path to the rt_producer.py script."""
    base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_path, "crawl_data", "rt_producer.py")

def is_process_running(pid: int) -> bool:
    """Check if a process with given PID is running."""
    try:
        process = psutil.Process(pid)
        return process.is_running() and process.status() != psutil.STATUS_ZOMBIE
    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
        return False

def find_running_producer() -> Optional[int]:
    """Find any running rt_producer.py process and return its PID."""
    try:
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                cmdline = proc.info.get('cmdline', [])
                if cmdline and 'rt_producer.py' in ' '.join(cmdline):
                    return proc.info['pid']
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
    except Exception:
        pass
    return None

def read_producer_status_file() -> Optional[Dict]:
    """Read producer status from shared status file."""
    try:
        base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        status_file = os.path.join(base_path, "logs", "producer_status.json")
        
        if os.path.exists(status_file):
            # Check if file is recent (modified within last 30 seconds)
            file_age = time.time() - os.path.getmtime(status_file)
            if file_age < 30:
                with open(status_file, 'r') as f:
                    return json.load(f)
    except Exception:
        pass
    return None

@router.get("/status", response_model=DataGenerationStatus)
async def get_data_generation_status():
    """Get the current status of the data generation process."""
    
    import time
    
    # Use a global key since no authentication is required
    user_key = "global_process"
    stored_process = _process_store.get(user_key)
    
    # Clean up old entries from recently stopped (older than 5 seconds)
    current_time = time.time()
    pids_to_remove = [pid for pid, stopped_time in _recently_stopped.items() 
                      if current_time - stopped_time > 5]
    for pid in pids_to_remove:
        _recently_stopped.pop(pid, None)
    
    # Try to read from status file first for real-time metrics
    status_file_data = read_producer_status_file()
    
    # Check if we have a stored process
    if stored_process:
        pid = stored_process.get("pid")
        if pid and is_process_running(pid):
            config_data = stored_process.get("config", {})
            
            # Use status file data if available, otherwise use stored data
            if status_file_data and status_file_data.get("pid") == pid:
                return DataGenerationStatus(
                    is_running=True,
                    process_id=pid,
                    started_at=stored_process.get("started_at"),
                    records_generated=status_file_data.get("records_generated", 0),
                    last_sequence=status_file_data.get("last_sequence"),
                    simulation_mode=status_file_data.get("simulation_mode") or config_data.get("simulation_mode"),
                    interval_seconds=status_file_data.get("interval_seconds") or config_data.get("interval_seconds"),
                    historical_days=config_data.get("historical_days"),
                    use_ml_scoring=config_data.get("use_ml_scoring"),
                    generate_with_scores=status_file_data.get("generate_with_scores") or config_data.get("generate_with_scores")
                )
            else:
                return DataGenerationStatus(
                    is_running=True,
                    process_id=pid,
                    started_at=stored_process.get("started_at"),
                    records_generated=stored_process.get("records_generated", 0),
                    last_sequence=stored_process.get("last_sequence"),
                    simulation_mode=config_data.get("simulation_mode"),
                    interval_seconds=config_data.get("interval_seconds"),
                    historical_days=config_data.get("historical_days"),
                    use_ml_scoring=config_data.get("use_ml_scoring"),
                    generate_with_scores=config_data.get("generate_with_scores")
                )
        else:
            # Process is no longer running, clean up store
            _process_store.pop(user_key, None)
    
    # Check if there's any rt_producer.py process running (started externally)
    running_pid = find_running_producer()
    if running_pid and running_pid not in _recently_stopped:
        # Found an external process, track it (but not if we just stopped it)
        # Try to get data from status file
        if status_file_data and status_file_data.get("pid") == running_pid:
            _process_store[user_key] = {
                "pid": running_pid,
                "started_at": datetime.utcnow().isoformat(),
                "config": {},
                "records_generated": status_file_data.get("records_generated", 0),
                "last_sequence": status_file_data.get("last_sequence", 0),
                "external": True
            }
            return DataGenerationStatus(
                is_running=True,
                process_id=running_pid,
                started_at=datetime.utcnow().isoformat(),
                records_generated=status_file_data.get("records_generated", 0),
                last_sequence=status_file_data.get("last_sequence", 0),
                simulation_mode=status_file_data.get("simulation_mode"),
                interval_seconds=status_file_data.get("interval_seconds"),
                generate_with_scores=status_file_data.get("generate_with_scores")
            )
        else:
            _process_store[user_key] = {
                "pid": running_pid,
                "started_at": datetime.utcnow().isoformat(),
                "config": {},
                "records_generated": 0,
                "last_sequence": 0,
                "external": True
            }
            return DataGenerationStatus(
                is_running=True,
                process_id=running_pid,
                started_at=datetime.utcnow().isoformat(),
                records_generated=0,
                last_sequence=0
            )
    
    return DataGenerationStatus(is_running=False)

@router.post("/start")
async def start_data_generation(
    config: DataGenerationConfig
):
    """Start the data generation process."""
    
    user_key = "global_process"
    
    # Check if already running
    if user_key in _process_store:
        stored_process = _process_store[user_key]
        pid = stored_process.get("pid")
        if pid and is_process_running(pid):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data generation is already running for this user"
            )
        else:
            # Clean up stale entry
            _process_store.pop(user_key, None)
    
    # Prepare environment variables
    env = os.environ.copy()
    env.update({
        "BOOTSTRAP_SERVERS": config.bootstrap_servers,
        "TOPIC_RAW": config.topic_raw,
        "INTERVAL_SEC": str(config.interval_seconds),
        "START_SEQ": str(config.start_sequence),
        "SIMULATION_MODE": config.simulation_mode,
        "HISTORICAL_DAYS": str(config.historical_days),
        "GENERATE_WITH_SCORES": str(config.generate_with_scores),
        "USE_ML_SCORING": str(config.use_ml_scoring),
        "SCORE_MIN": str(config.score_min),
        "SCORE_MAX": str(config.score_max),
        "PYTHONUNBUFFERED": "1"
    })
    
    # Get script path
    script_path = get_producer_script_path()
    
    if not os.path.exists(script_path):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Producer script not found at {script_path}"
        )
    
    try:
        # Prepare log files
        base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        logs_dir = os.path.join(base_path, "logs")
        os.makedirs(logs_dir, exist_ok=True)
        
        # Open log files with buffering disabled for real-time logs
        stdout_log = open(os.path.join(logs_dir, "producer.log"), "a", buffering=1)
        stderr_log = open(os.path.join(logs_dir, "producer_error.log"), "a", buffering=1)
        
        # Start the process
        process = subprocess.Popen(
            ["python", "-u", script_path],  # -u for unbuffered Python output
            env=env,
            stdout=stdout_log,
            stderr=stderr_log,
            start_new_session=True,  # Create new session (works cross-platform)
            close_fds=False  # Keep file descriptors open for the subprocess
        )
        
        # Store process info (keep file handles so they stay open)
        _process_store[user_key] = {
            "pid": process.pid,
            "started_at": datetime.utcnow().isoformat(),
            "config": config.dict(),
            "records_generated": 0,
            "last_sequence": config.start_sequence,
            "_log_handles": (stdout_log, stderr_log)  # Keep handles alive
        }
        
        return {
            "message": "Data generation started successfully",
            "process_id": process.pid,
            "config": config.dict()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start data generation: {str(e)}"
        )

@router.post("/stop")
async def stop_data_generation():
    """Stop the data generation process."""
    
    user_key = "global_process"
    
    stored_process = _process_store.get(user_key)
    if not stored_process:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No data generation process found for this user"
        )
    
    pid = stored_process.get("pid")
    if not pid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid process ID found"
        )
    
    try:
        # Close log file handles if they exist
        log_handles = stored_process.get("_log_handles")
        if log_handles:
            try:
                log_handles[0].close()  # stdout
                log_handles[1].close()  # stderr
            except:
                pass
        
        # Kill the process group to ensure all child processes are terminated
        os.killpg(os.getpgid(pid), signal.SIGTERM)
        
        # Mark this PID as recently stopped to avoid re-tracking
        import time
        _recently_stopped[pid] = time.time()
        
        # Wait a bit for the process to actually terminate
        time.sleep(0.5)
        
        # Clean up store
        _process_store.pop(user_key, None)
        
        return {
            "message": "Data generation stopped successfully",
            "process_id": pid
        }
        
    except ProcessLookupError:
        # Process already terminated
        _process_store.pop(user_key, None)
        return {
            "message": "Process was already terminated",
            "process_id": pid
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop data generation: {str(e)}"
        )

@router.get("/logs")
async def get_data_generation_logs(
    lines: int = 50
):
    """Get recent logs from the data generation process."""
    
    user_key = "global_process"
    
    stored_process = _process_store.get(user_key)
    if not stored_process:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No data generation process found for this user"
        )
    
    pid = stored_process.get("pid")
    if not pid or not is_process_running(pid):
        return {
            "logs": ["Process is not running or has terminated"],
            "process_id": pid,
            "is_running": False
        }
    
    try:
        # For now, return process status info
        # In a real implementation, you'd want to capture and store logs
        process = psutil.Process(pid)
        
        return {
            "logs": [
                f"Process ID: {pid}",
                f"Status: {process.status()}",
                f"CPU Percent: {process.cpu_percent()}%",
                f"Memory: {process.memory_info().rss / 1024 / 1024:.2f} MB",
                f"Started: {stored_process.get('started_at')}",
                f"Config: {json.dumps(stored_process.get('config', {}), indent=2)}"
            ],
            "process_id": pid,
            "is_running": True
        }
        
    except Exception as e:
        return {
            "logs": [f"Error retrieving logs: {str(e)}"],
            "process_id": pid,
            "is_running": False
        }