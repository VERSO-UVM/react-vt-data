"""Serve saved eval runs to the local comparison page (/chat/evals).

Development only: mounted when CHAT_EVALS_DIR points at a results folder
(`just chat-eval-ui` sets it). See docs/guides/chat-evals.md.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

RUN_ID = re.compile(r"^[A-Za-z0-9_.-]+$")
# Runs change as new ones are saved; never let the API's GET cache hold them.
NO_STORE = {"Cache-Control": "no-store"}


def create_evals_router(results_dir: Path) -> APIRouter:
    router = APIRouter(prefix="/chat/evals", tags=["chat-evals"])

    @router.get("")
    def list_runs():
        runs = []
        for path in sorted(results_dir.glob("*.json"), reverse=True):
            try:
                run = json.loads(path.read_text())
            except (OSError, ValueError):
                continue
            runs.append(
                {
                    "run_id": run.get("run_id", path.stem),
                    "created_at": run.get("created_at"),
                    "models": run.get("models", []),
                    "judge_model": run.get("judge_model"),
                    "cases": len(run.get("cases", [])),
                    "summary": run.get("summary", []),
                }
            )
        return JSONResponse(runs, headers=NO_STORE)

    @router.get("/{run_id}")
    def get_run(run_id: str):
        path = results_dir / f"{run_id}.json"
        if not RUN_ID.match(run_id) or not path.is_file():
            raise HTTPException(404, "No eval run with that id")
        return JSONResponse(json.loads(path.read_text()), headers=NO_STORE)

    return router
