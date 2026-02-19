"""
Ensure backend/ is on sys.path and the working directory is set to backend/
so relative paths (e.g., logger/logsapi.log) resolve correctly.
"""
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))
os.chdir(backend_dir)
