"""Play eval chats through the real agent, check them, judge them, and save a run."""

from __future__ import annotations

import asyncio
import json
import subprocess
import time
from collections.abc import Callable
from contextlib import aclosing
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from chat.agent import build_agent, stream_answer, to_history
from chat.charts import DataRef, resolve_rows
from chat.config import ChatSettings
from data_tools.service import DataToolService

from .cases import Case
from .judge import GENERAL_CRITERIA, build_judge, judge_chat

RESULTS_DIR = Path(__file__).with_name("results")
CHART_PREVIEW_ROWS = 15
# Seconds before a stuck turn or judgment is abandoned. Normal turns take
# 10-80 s; a stalled provider can otherwise hold a run for many minutes.
TURN_TIMEOUT = 180.0
JUDGE_TIMEOUT = 180.0


async def play_chat(
    agent,
    settings: ChatSettings,
    service: DataToolService,
    case: Case,
    turn_timeout: float = TURN_TIMEOUT,
) -> list[dict[str, Any]]:
    """Ask each of the case's questions in order, as the chat page would.

    A turn that runs past `turn_timeout` seconds (a stalled provider, say) ends
    with an error instead of holding up the whole run.
    """
    history: list[dict[str, str]] = []
    turns = []
    for question in case.turns:
        started = time.monotonic()
        answer, error, usage = "", None, {}
        steps: dict[str, dict[str, Any]] = {}
        charts: list[dict[str, Any]] = []
        try:
            async with asyncio.timeout(turn_timeout):
                # aclosing: a timed-out turn still closes the model stream.
                async with aclosing(
                    stream_answer(agent, settings, question, to_history(history))
                ) as events:
                    async for event in events:
                        kind = event["type"]
                        if kind == "text":
                            answer += event["delta"]
                        elif kind == "tool_call":
                            steps[event["id"]] = {
                                "name": event["name"],
                                "ok": True,
                                "error": None,
                            }
                        elif kind == "tool_result" and event["id"] in steps:
                            steps[event["id"]].update(
                                ok=event["ok"], error=event["error"]
                            )
                        elif kind == "chart":
                            charts.append(event["chart"])
                        elif kind == "done":
                            usage = event["usage"]
                        elif kind == "error":
                            error = event["message"]
        except TimeoutError:
            error = f"Timed out after {turn_timeout:.0f}s"
        turns.append(
            {
                "question": question,
                "answer": answer,
                "steps": list(steps.values()),
                "charts": [chart_with_preview(service, c) for c in charts],
                "error": error,
                "usage": usage,
                "latency_s": round(time.monotonic() - started, 2),
            }
        )
        if answer and not error:
            # Same text-only history the browser sends (chatStore.toHistory).
            notes = [f"[Chart shown: {c['title']}]" for c in charts]
            history += [
                {"role": "user", "content": question},
                {"role": "assistant", "content": "\n".join([*notes, answer])},
            ]
    return turns


def chart_with_preview(
    service: DataToolService, spec: dict[str, Any]
) -> dict[str, Any]:
    """The chart spec plus the first rows it draws, so the judge can check it."""
    try:
        resolved = resolve_rows(service, DataRef.model_validate(spec["data"]), 5000)
    except Exception as exc:  # noqa: BLE001 -- recorded for the judge and the UI
        return {**spec, "rows_preview": [], "row_count": 0, "data_error": str(exc)}
    hidden = {"_location_id", "_units", "_unit_issue"}
    return {
        **spec,
        "row_count": len(resolved["rows"]),
        "rows_preview": [
            {k: v for k, v in r.items() if k not in hidden}
            for r in resolved["rows"][:CHART_PREVIEW_ROWS]
        ],
    }


def automatic_checks(case: Case, turns: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Cheap pass/fail checks that need no judge."""
    errors = [t["error"] for t in turns if t["error"]]
    checks = [
        {
            "name": "Finishes without an error",
            "passed": not errors,
            "detail": errors[0] if errors else "Every turn finished.",
        }
    ]
    longest = max(len(t["answer"].split()) for t in turns)
    checks.append(
        {
            "name": f"Answers stay under {case.max_words} words",
            "passed": longest <= case.max_words,
            "detail": f"Longest answer: {longest} words.",
        }
    )
    if case.expect_chart:
        kinds = [c["kind"] for t in turns for c in t["charts"]]
        checks.append(
            {
                "name": f"Shows a {' or '.join(case.expect_chart)} chart",
                "passed": any(k in case.expect_chart for k in kinds),
                "detail": f"Charts shown: {', '.join(kinds) or 'none'}.",
            }
        )
    return checks


def score(checks: list[dict[str, Any]], judge: dict[str, Any] | None) -> float | None:
    """Share of checks and judge criteria passed; None if the judge failed."""
    if judge is None or judge.get("error"):
        return None
    items = [c["passed"] for c in checks] + [c["passed"] for c in judge["criteria"]]
    return round(sum(items) / len(items), 3)


async def run_one(
    model: str,
    case: Case,
    repeat: int,
    *,
    service: DataToolService,
    references: list[dict[str, Any]],
    judge,
    turn_timeout: float = TURN_TIMEOUT,
    judge_timeout: float = JUDGE_TIMEOUT,
) -> dict[str, Any]:
    settings = ChatSettings(model=model, warehouse_path=service.warehouse_path)
    agent = build_agent(settings, service)
    turns = await play_chat(agent, settings, service, case, turn_timeout)
    checks = automatic_checks(case, turns)
    verdict = None
    if judge is not None:
        try:
            async with asyncio.timeout(judge_timeout):
                verdict = await judge_chat(
                    judge,
                    case.title,
                    case.criteria + GENERAL_CRITERIA,
                    references,
                    turns,
                )
        except TimeoutError:
            verdict = {"error": f"The judge timed out after {judge_timeout:.0f}s"}
        except Exception as exc:  # noqa: BLE001 -- keep the chat; report the judge failure
            verdict = {"error": f"{type(exc).__name__}: {exc}"}
    costs = [t["usage"].get("cost_usd") for t in turns]
    return {
        "model": model,
        "case_id": case.id,
        "repeat": repeat,
        "turns": turns,
        "checks": checks,
        "judge": verdict,
        "score": score(checks, verdict),
        "cost_usd": round(sum(costs), 6) if all(c is not None for c in costs) else None,
        "latency_s": round(sum(t["latency_s"] for t in turns), 2),
        "tokens": sum(
            t["usage"].get("input_tokens", 0) + t["usage"].get("output_tokens", 0)
            for t in turns
        ),
    }


def _mean(values: list[float]) -> float | None:
    return round(sum(values) / len(values), 4) if values else None


def summarize(models: list[str], results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = []
    for model in models:
        mine = [r for r in results if r["model"] == model]
        rows.append(
            {
                "model": model,
                "chats": len(mine),
                "score": _mean([r["score"] for r in mine if r["score"] is not None]),
                "quality": _mean(
                    [
                        r["judge"]["quality"]
                        for r in mine
                        if r["judge"] and "quality" in r["judge"]
                    ]
                ),
                "cost_per_chat": _mean(
                    [r["cost_usd"] for r in mine if r["cost_usd"] is not None]
                ),
                "latency_s": _mean([r["latency_s"] for r in mine]),
                "tokens": _mean([r["tokens"] for r in mine]),
                "errors": sum(1 for r in mine if any(t["error"] for t in r["turns"])),
            }
        )
    return rows


def _git_sha() -> str | None:
    try:
        return subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True,
            text=True,
            check=True,
        ).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return None


async def run_eval(
    models: list[str],
    cases: list[Case],
    *,
    judge_model: str | None,
    repeat: int = 1,
    concurrency: int = 3,
    service: DataToolService | None = None,
    judge=None,
    on_result: Callable[[dict[str, Any]], None] | None = None,
    save_dir: Path | None = None,
    turn_timeout: float = TURN_TIMEOUT,
    judge_timeout: float = JUDGE_TIMEOUT,
) -> dict[str, Any]:
    """Run every case for every model (times `repeat`) and judge each chat.

    With `save_dir`, the run is saved when it starts and after every chat,
    marked incomplete until the end, so an interrupted run keeps its finished
    chats and the comparison page can show progress.
    """
    service = service or DataToolService()
    if judge is None and judge_model:
        judge = build_judge(judge_model)
    references = {c.id: [r.run(service) for r in c.reference] for c in cases}
    created = datetime.now(UTC)
    run: dict[str, Any] = {
        "run_id": created.strftime("%Y%m%d-%H%M%S"),
        "created_at": created.isoformat(),
        "git_sha": _git_sha(),
        "judge_model": judge_model,
        "models": models,
        "repeat": repeat,
        "total": len(models) * len(cases) * repeat,
        "complete": False,
        "cases": [
            {
                "id": c.id,
                "title": c.title,
                "capability": c.capability,
                "turns": c.turns,
                "criteria": c.criteria + GENERAL_CRITERIA,
                "references": references[c.id],
            }
            for c in cases
        ],
        "results": [],
        "summary": summarize(models, []),
    }

    def checkpoint() -> None:
        run["summary"] = summarize(models, run["results"])
        if save_dir is not None:
            save_run(run, save_dir)

    checkpoint()
    gate = asyncio.Semaphore(concurrency)

    async def job(model: str, case: Case, n: int):
        async with gate:
            result = await run_one(
                model,
                case,
                n,
                service=service,
                references=references[case.id],
                judge=judge,
                turn_timeout=turn_timeout,
                judge_timeout=judge_timeout,
            )
        run["results"].append(result)
        checkpoint()
        if on_result:
            on_result(result)

    await asyncio.gather(
        *(job(m, c, n) for m in models for c in cases for n in range(repeat))
    )
    run["complete"] = True
    checkpoint()
    return run


def merge_runs(base: dict[str, Any], *others: dict[str, Any]) -> dict[str, Any]:
    """Add other runs' models to `base`, e.g. a candidate tried later.

    The runs must cover the same cases with the same judge and repeat count, so
    the merged comparison stays like for like.
    """
    merged = {**base, "models": list(base["models"]), "results": list(base["results"])}
    case_ids = [c["id"] for c in base["cases"]]
    for other in others:
        if [c["id"] for c in other["cases"]] != case_ids:
            raise ValueError(f"Run {other['run_id']} covers different cases")
        if other.get("judge_model") != base.get("judge_model"):
            raise ValueError(f"Run {other['run_id']} used a different judge")
        if other.get("repeat") != base.get("repeat"):
            raise ValueError(f"Run {other['run_id']} used a different repeat count")
        overlap = set(other["models"]) & set(merged["models"])
        if overlap:
            raise ValueError(f"Both runs include {', '.join(sorted(overlap))}")
        merged["models"] += other["models"]
        merged["results"] += other["results"]
    merged["total"] = sum(r.get("total", len(r["results"])) for r in (base, *others))
    merged["complete"] = all(r.get("complete", True) for r in (base, *others))
    merged["merged_from"] = [r["run_id"] for r in others]
    merged["summary"] = summarize(merged["models"], merged["results"])
    return merged


def save_run(run: dict[str, Any], out_dir: Path = RESULTS_DIR) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{run['run_id']}.json"
    # Write then rename, so a reader never sees a half-written file.
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(run, indent=2, default=str))
    tmp.replace(path)
    return path
