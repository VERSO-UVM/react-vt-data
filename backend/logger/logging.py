import logging
from logging.handlers import RotatingFileHandler
import sys


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
