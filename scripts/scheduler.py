import os, sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

import logging  
import os 
import signal  
import subprocess  
import sys  
import time  
from pathlib import Path  
from utils.logging_utils import configure_logging  

configure_logging() 

PROJECT_ROOT = Path(__file__).resolve().parent.parent  
PYTHON_BIN = os.getenv("PYTHON_BIN", sys.executable)  
BATCH_INTERVAL_SECONDS = int(os.getenv("BATCH_INTERVAL_SECONDS", "60"))  
RETRAIN_EVERY_N_BATCHES = int(os.getenv("RETRAIN_EVERY_N_BATCHES", "1"))  

_should_exit = False  

# Đánh dấu cờ để vòng lặp chính thoát an toàn khi nhận tín hiệu
def _handle_shutdown(signum, frame):
    global _should_exit  
    _should_exit = True  

for sig in (signal.SIGINT, signal.SIGTERM):  # Duyệt hai tín hiệu cần xử lý: Ctrl+C và dừng hệ thống
    signal.signal(sig, _handle_shutdown)   # Gán handler để đổi cờ khi nhận tín hiệu


def _run_python_script(label: str, relative_path: str) -> int:
    """Chạy một script Python và log kết quả."""
    script_path = PROJECT_ROOT / relative_path  # Tạo đường dẫn tuyệt đối tới script cần chạy
    logging.info("Running %s (%s)", label, script_path)  # Ghi log bắt đầu thực hiện
    result = subprocess.run(
        [PYTHON_BIN, str(script_path)], 
        cwd=PROJECT_ROOT,  
        check=False,  
    )
    if result.returncode == 0:  # Kiểm tra script có chạy thành công hay không
        logging.info("%s completed successfully", label)  
    else:
        logging.error("%s exited with code %s", label, result.returncode)  # Log lỗi và mã exit khi thất bại
    return result.returncode  


def main() -> None:
    logging.info(
        "Scheduler starting: batch every %ss, retrain every %s batches",  
        BATCH_INTERVAL_SECONDS,  # Thời gian giữa các lần chạy batch
        RETRAIN_EVERY_N_BATCHES,  # Số vòng batch giữa các đợt retrain
    )

    batch_count = 0  # Biến đếm số vòng batch đã chạy
    while not _should_exit:  # Lặp cho tới khi nhận tín hiệu dừng
        batch_count += 1 
        loop_started = time.monotonic()  

        # _run_python_script("batch job", "app/batch_job.py")  

        if batch_count % RETRAIN_EVERY_N_BATCHES == 0:  # Kiểm tra có tới chu kỳ retrain hay chưa
            _run_python_script("retrain rolling (MLflow)", "scripts/retrain_rolling_mlflow.py") 

        elapsed = time.monotonic() - loop_started  # Tính thời gian vòng lặp vừa rồi đã tiêu tốn
        sleep_seconds = max(0.0, BATCH_INTERVAL_SECONDS - elapsed)  # Xác định cần ngủ bao lâu để giữ chu kỳ ổn định
        logging.info("Loop done in %.2fs; sleeping %.2fs", elapsed, sleep_seconds)  

        slept = 0.0  # Tổng thời gian đã ngủ trong giai đoạn chờ
        while slept < sleep_seconds and not _should_exit:  # Lặp ngủ từng đoạn ngắn để phản ứng nhanh với tín hiệu dừng
            interval = min(1.0, sleep_seconds - slept)  # Chia giấc ngủ thành bước tối đa 1 giây
            time.sleep(interval)  # Ngủ trong bước hiện tại
            slept += interval  # Cộng dồn thời gian đã ngủ

    logging.info("Scheduler received shutdown signal; exiting.")  


if __name__ == "__main__": 
    main()  
