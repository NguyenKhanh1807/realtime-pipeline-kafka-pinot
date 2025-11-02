import logging
import os
import sys
from typing import Optional, Union

DEFAULT_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"


def configure_logging(level: Optional[Union[str, int]] = None) -> None:
    """
    Chuẩn hóa cấu hình logging cho toàn dự án.

    - Mức log lấy từ tham số `level` (nếu có) hoặc biến môi trường LOG_LEVEL (mặc định INFO).
    - Format có thể override qua LOG_FORMAT nếu cần.
    - Ghi log ra STDOUT để tương thích với docker/compose.
    - force=True để đảm bảo có thể tái cấu hình khi đã thiết lập trước đó.
    """
    chosen_level = level or os.getenv("LOG_LEVEL", "INFO")
    if isinstance(chosen_level, str):
        chosen_level = chosen_level.upper()
    logging.basicConfig(
        level=chosen_level,
        format=os.getenv("LOG_FORMAT", DEFAULT_FORMAT),
        stream=sys.stdout,
        force=True,
    )
