"""The judge: a strong model grades one chat transcript against its case."""

from __future__ import annotations

import json
from typing import Any

from pydantic import BaseModel, Field
from pydantic_ai import Agent, PromptedOutput

from chat.agent import turn_cost
from chat.config import PROVIDER_ROUTING, model_name

DEFAULT_JUDGE = "anthropic/claude-opus-5.5"

# Applied to every case, after the case's own criteria.
GENERAL_CRITERIA = [
    "Every number in the answers is supported by the reference data or by the agent's own tool results; nothing is invented.",
    "The answers are clear and concise for a non-technical reader (a planner or select board member), leading with the answer.",
    "Any chart or table fits the question: the right kind, the right columns, and nothing misleading.",
]

INSTRUCTIONS = """\
You grade answers from a data assistant for Vermont planners. You get the
user's questions, the assistant's answers (with the charts and tables it
showed and the tools it used), reference data pulled from the same warehouse
the assistant uses, and numbered criteria.

For each criterion, decide pass or fail and give a one-sentence reason. Be
strict and literal: a criterion passes only if the answers clearly meet it.
Judge numbers against the reference data; small rounding differences are fine.
If a criterion doesn't apply (for example, it asks about a chart and none was
needed), pass it and say why.

Then rate overall quality from 1 to 10 for a planner relying on this answer,
and write a two-sentence summary of the main strengths and problems.
"""


class CriterionResult(BaseModel):
    criterion: int = Field(description="The criterion's number, starting at 1.")
    passed: bool
    reason: str


class Verdict(BaseModel):
    criteria: list[CriterionResult]
    quality: int = Field(ge=1, le=10)
    summary: str


def build_judge(model: str = DEFAULT_JUDGE) -> Agent:
    name = model_name(model)
    settings: dict[str, Any] = {"max_tokens": 8000}
    if name.startswith("openrouter:"):
        settings["openrouter_usage"] = {"include": True}
        settings["openrouter_provider"] = PROVIDER_ROUTING
    # Prompted (JSON in the reply) rather than tool output: some judge models
    # reject forced tool calls, and this works the same on every provider.
    return Agent(
        name,
        output_type=PromptedOutput(Verdict),
        instructions=INSTRUCTIONS,
        model_settings=settings,
        retries=2,
        defer_model_check=True,
    )


def judge_prompt(
    case_title: str,
    criteria: list[str],
    references: list[dict[str, Any]],
    turns: list[dict[str, Any]],
) -> str:
    lines = [f"# Case: {case_title}", "", "## Conversation"]
    for i, turn in enumerate(turns, 1):
        lines += [f"### Turn {i}", f"User: {turn['question']}", ""]
        steps = ", ".join(
            s["name"] + ("" if s["ok"] else " (failed)") for s in turn["steps"]
        )
        lines.append(f"Tools used: {steps or 'none'}")
        for chart in turn["charts"]:
            lines.append(
                "Chart shown: "
                + json.dumps(
                    {k: chart[k] for k in chart if k != "rows_preview"}, default=str
                )
            )
            lines.append(
                "Chart rows (first rows): "
                + json.dumps(chart.get("rows_preview", []), default=str)
            )
        if turn.get("error"):
            lines.append(f"The turn ended with an error: {turn['error']}")
        lines += ["Assistant answer:", turn["answer"] or "(no text)", ""]
    lines.append("## Reference data")
    for ref in references:
        lines.append(f"### {ref['label']} ({ref['row_count']} rows)")
        lines.append(json.dumps(ref["rows"], default=str))
    lines += ["", "## Criteria"]
    lines += [f"{i}. {c}" for i, c in enumerate(criteria, 1)]
    return "\n".join(lines)


async def judge_chat(
    judge: Agent,
    case_title: str,
    criteria: list[str],
    references: list[dict[str, Any]],
    turns: list[dict[str, Any]],
) -> dict[str, Any]:
    """Grade one chat. Returns per-criterion results, quality, and cost."""
    prompt = judge_prompt(case_title, criteria, references, turns)
    result = await judge.run(prompt)
    verdict: Verdict = result.output
    by_number = {r.criterion: r for r in verdict.criteria}
    graded = []
    for i, text in enumerate(criteria, 1):
        r = by_number.get(i)
        graded.append(
            {
                "text": text,
                "passed": bool(r and r.passed),
                "reason": r.reason if r else "The judge did not grade this criterion.",
            }
        )
    return {
        "criteria": graded,
        "quality": verdict.quality,
        "summary": verdict.summary,
        "cost_usd": turn_cost(result.new_messages()),
    }
