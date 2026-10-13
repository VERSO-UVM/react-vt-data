"""Command line for the Data Chat evals.

    uv run python -m evals.chat run --models openai/gpt-6.1-sol openai/gpt-6-luna
    uv run python -m evals.chat cases
    uv run python -m evals.chat models --max-price 1

Or through just: `just chat-eval openai/gpt-6.1-sol openai/gpt-6-luna`.
See docs/guides/chat-evals.md.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import urllib.request
from pathlib import Path

from .cases import load_cases
from .judge import DEFAULT_JUDGE
from .runner import RESULTS_DIR, run_eval, save_run

REPO_ROOT = Path(__file__).resolve().parents[3]


def load_dotenv(path: Path = REPO_ROOT / ".env") -> None:
    """Read KEY=VALUE lines from the repo's .env without overriding the shell.

    `just` loads .env for recipes; this does the same for direct runs."""
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip("'\""))


def split_models(values: list[str]) -> list[str]:
    """Accept models space- or comma-separated."""
    return [m for v in values for m in v.replace(",", " ").split() if m]


def fmt(value, kind: str) -> str:
    if value is None:
        return "—"
    return {
        "pct": f"{value:.0%}",
        "quality": f"{value:.1f}/10",
        "usd": f"${value:.4f}",
        "s": f"{value:.0f}s",
        "int": f"{value:,.0f}",
    }[kind]


def print_summary(run: dict) -> None:
    header = ["Model", "Score", "Quality", "$/chat", "Time/chat", "Tokens", "Errors"]
    rows = [
        [
            s["model"],
            fmt(s["score"], "pct"),
            fmt(s["quality"], "quality"),
            fmt(s["cost_per_chat"], "usd"),
            fmt(s["latency_s"], "s"),
            fmt(s["tokens"], "int"),
            str(s["errors"]),
        ]
        for s in run["summary"]
    ]
    widths = [max(len(r[i]) for r in [header, *rows]) for i in range(len(header))]
    for r in [header, ["-" * w for w in widths], *rows]:
        print("  ".join(cell.ljust(w) for cell, w in zip(r, widths)))


def cmd_run(args) -> int:
    models = split_models(args.models)
    needs_key = any(not m.startswith(("demo", "test")) for m in models)
    if needs_key and not os.environ.get("OPENROUTER_API_KEY"):
        print(
            "Set OPENROUTER_API_KEY in .env (or the environment) first.",
            file=sys.stderr,
        )
        return 2
    cases = load_cases(only=args.cases or None)
    judge = None if args.no_judge else args.judge
    total = len(models) * len(cases) * args.repeat
    print(
        f"Running {len(cases)} chats x {len(models)} models x {args.repeat} "
        f"= {total} chats; judge: {judge or 'none'}\n"
    )

    def progress(result: dict) -> None:
        cost = fmt(result["cost_usd"], "usd")
        print(
            f"  {result['model']:<34} {result['case_id']:<24} "
            f"score {fmt(result['score'], 'pct'):>5}  {cost:>8}  {result['latency_s']:.0f}s",
            flush=True,
        )

    run = asyncio.run(
        run_eval(
            models,
            cases,
            judge_model=judge,
            repeat=args.repeat,
            concurrency=args.concurrency,
            on_result=progress,
        )
    )
    path = save_run(run, Path(args.out))
    print()
    print_summary(run)
    judge_cost = [
        r["judge"]["cost_usd"]
        for r in run["results"]
        if r["judge"] and r["judge"].get("cost_usd")
    ]
    if judge_cost:
        print(f"\nJudge cost: ${sum(judge_cost):.4f}")
    print(f"\nSaved {path}")
    print(
        "Compare them side by side: just chat-eval-ui, then open http://localhost:3000/chat/evals/"
    )
    return 0


def cmd_cases(_args) -> int:
    for c in load_cases():
        turns = " → ".join(c.turns)
        print(f"{c.id:<24} [{c.capability}] {turns}")
    return 0


def cmd_models(args) -> int:
    """Tool-capable OpenRouter models, cheapest first, to pick candidates from."""
    with urllib.request.urlopen("https://openrouter.ai/api/v1/models", timeout=30) as r:
        models = json.load(r)["data"]
    rows = []
    for m in models:
        if "tools" not in (m.get("supported_parameters") or []) or ":" in m["id"]:
            continue
        if args.filter and args.filter.lower() not in m["id"].lower():
            continue
        price_in = float(m["pricing"].get("prompt") or 0) * 1e6
        price_out = float(m["pricing"].get("completion") or 0) * 1e6
        if args.max_price is not None and price_out > args.max_price:
            continue
        rows.append((price_out, price_in, m["id"]))
    print(f"{'Model':<50} {'$/M in':>8} {'$/M out':>8}")
    for price_out, price_in, mid in sorted(rows):
        print(f"{mid:<50} {price_in:>8.3f} {price_out:>8.3f}")
    return 0


def main(argv: list[str] | None = None) -> int:
    load_dotenv()
    parser = argparse.ArgumentParser(
        prog="python -m evals.chat", description=__doc__.split("\n")[0]
    )
    sub = parser.add_subparsers(dest="command", required=True)

    run = sub.add_parser("run", help="Run the eval chats for one or more models")
    run.add_argument(
        "--models",
        nargs="+",
        required=True,
        help="OpenRouter slugs (or any Pydantic AI model string)",
    )
    run.add_argument("--cases", nargs="*", help="Only these case ids (default: all)")
    run.add_argument(
        "--repeat", type=int, default=1, help="Run each chat N times to see variance"
    )
    run.add_argument(
        "--judge", default=DEFAULT_JUDGE, help=f"Judge model (default {DEFAULT_JUDGE})"
    )
    run.add_argument(
        "--no-judge", action="store_true", help="Skip judging; only automatic checks"
    )
    run.add_argument("--concurrency", type=int, default=3, help="Chats running at once")
    run.add_argument("--out", default=str(RESULTS_DIR), help="Where to save the run")
    run.set_defaults(func=cmd_run)

    sub.add_parser("cases", help="List the eval cases").set_defaults(func=cmd_cases)

    models = sub.add_parser(
        "models", help="List tool-capable OpenRouter models by price"
    )
    models.add_argument("--filter", help="Only ids containing this text")
    models.add_argument(
        "--max-price", type=float, help="Max $ per million output tokens"
    )
    models.set_defaults(func=cmd_models)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
