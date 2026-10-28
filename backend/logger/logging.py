import logging
import os
import re
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path


def setup_api_logger(
    name: str = "api",
    log_file: str = "logger/logsapi.log",
    level: int = logging.DEBUG,
    max_bytes: int = 10_000_000,
    backup_count: int = 5,
) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(level)

    if logger.handlers:
        return logger

    # File handler
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=max_bytes,
        backupCount=backup_count,
    )

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)

    # Formatter without request_id (or make it optional)
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )

    file_handler.setFormatter(formatter)
    console_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    logger.propagate = False

    return logger


def setup_etl_logging(name: str, level: int = logging.INFO) -> None:
    """Configure root logging for an ETL run.

    Console gets `level` and above; $DATA_DIR/logs/etl.log gets everything (DEBUG).
    `name` tags each line with the ETL stage, since all stages share one file.
    """
    data_dir = Path(
        os.getenv("DATA_DIR", Path(__file__).resolve().parent.parent / "Data")
    )
    log_dir = data_dir / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)

    file_handler = RotatingFileHandler(
        log_dir / "etl.log", maxBytes=10_000_000, backupCount=5
    )
    file_handler.setLevel(logging.DEBUG)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)

    # requests errors embed the full URL, including the Census API key.
    def redact_key(record: logging.LogRecord) -> bool:
        record.msg = re.sub(r"key=[^&\s'\"]+", "key=***", record.getMessage())
        record.args = None
        return True

    file_handler.addFilter(redact_key)
    console_handler.addFilter(redact_key)

    logging.basicConfig(
        level=logging.DEBUG,
        format=f"%(asctime)s - {name} - %(name)s - %(levelname)s - %(message)s",
        handlers=[file_handler, console_handler],
    )

    # Third-party request logs include full URLs, and the Census key goes in
    # the query string. Keep them out of the log file.
    for noisy in ("urllib3", "requests"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
