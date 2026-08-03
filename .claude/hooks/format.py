#!/usr/bin/env python3
"""PostToolUse hook: format files Claude edits.

.py -> ruff format (config in backend/pyproject.toml)
.ts/.tsx -> prettier (frontend's local install, config in frontend/.prettierrc)
"""

import json
import os
import subprocess
import sys

payload = json.load(sys.stdin)
file_path = payload.get("tool_input", {}).get("file_path") or payload.get(
    "tool_response", {}
).get("filePath")

if not file_path:
    sys.exit(0)

project_dir = os.environ.get("CLAUDE_PROJECT_DIR", "")

if file_path.endswith(".py"):
    subprocess.run(["uvx", "ruff", "format", file_path], check=False)
elif file_path.endswith((".ts", ".tsx")):
    frontend = os.path.join(project_dir, "frontend")
    prettier = os.path.join(frontend, "node_modules", ".bin", "prettier")
    subprocess.run([prettier, "--write", file_path], check=False, cwd=frontend)
