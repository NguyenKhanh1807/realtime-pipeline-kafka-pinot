"""
MLflow operations API endpoints.
"""

import subprocess
import asyncio
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()
logger = logging.getLogger(__name__)


class TrainRequest(BaseModel):
    force: bool = False


class TrainResponse(BaseModel):
    success: bool
    message: str
    output: Optional[str] = None
    details: Optional[str] = None


@router.post("/train", response_model=TrainResponse)
async def train_model(request: TrainRequest):
    """
    Train the fraud detection model using data from Pinot.
    Runs the training script inside the Docker container.
    """
    try:
        # Check if sufficient data exists (unless force=True)
        if not request.force:
            import requests
            try:
                pinot_res = requests.post(
                    'http://pinot-broker:8099/query/sql',
                    headers={'Content-Type': 'application/json'},
                    json={'sql': 'SELECT COUNT(*) as total, SUM(label) as fraud_count FROM transactions'},
                    timeout=30
                )
                
                if pinot_res.ok:
                    result = pinot_res.json()
                    rows = result.get('resultTable', {}).get('rows', [])
                    if rows:
                        total, fraud_count = rows[0]
                        
                        if total < 500:
                            return TrainResponse(
                                success=False,
                                message=f"Insufficient data: {total} transactions (minimum 500 required)",
                                details=f"Total: {total}, Fraud: {fraud_count}"
                            )
                        
                        if fraud_count == 0:
                            return TrainResponse(
                                success=False,
                                message="No fraud cases found. Model needs labeled fraud examples.",
                                details=f"Total: {total}, Fraud: {fraud_count}"
                            )
            except Exception as e:
                logger.warning(f"Could not check Pinot data: {e}")
                # Continue anyway if Pinot check fails
        
        # Run training script
        logger.info("Starting model training...")
        script_path = "/app/scripts/train_fraud_model.py"
        
        # Run the training script as a subprocess
        process = await asyncio.create_subprocess_exec(
            "python3",
            script_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd="/app"
        )
        
        stdout, stderr = await asyncio.wait_for(
            process.communicate(),
            timeout=600  # 10 minutes timeout
        )
        
        stdout_text = stdout.decode('utf-8') if stdout else ""
        stderr_text = stderr.decode('utf-8') if stderr else ""
        
        if process.returncode == 0:
            logger.info("Model training completed successfully")
            # Get last 20 lines of output
            output_lines = stdout_text.split('\n')
            last_lines = '\n'.join(output_lines[-20:])
            
            return TrainResponse(
                success=True,
                message="Model training completed successfully",
                output=last_lines
            )
        else:
            logger.error(f"Training failed with code {process.returncode}")
            logger.error(f"Stderr: {stderr_text}")
            return TrainResponse(
                success=False,
                message="Training failed",
                details=stderr_text or stdout_text
            )
    
    except asyncio.TimeoutError:
        logger.error("Training timed out after 10 minutes")
        return TrainResponse(
            success=False,
            message="Training timed out after 10 minutes",
            details="Consider using smaller dataset or increase timeout"
        )
    
    except Exception as e:
        logger.error(f"Training error: {e}", exc_info=True)
        return TrainResponse(
            success=False,
            message="Training failed",
            details=str(e)
        )
