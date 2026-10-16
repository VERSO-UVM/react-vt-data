"""A scripted offline model (CHAT_MODEL=demo) for building the UI without an API key.

It always fetches one income series, charts it by reference, and streams a
canned answer, which exercises every event type the browser handles.
"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator

from pydantic_ai import ModelMessage, ModelRequest, ToolReturnPart, UserPromptPart
from pydantic_ai.models.function import (
    AgentInfo,
    DeltaToolCall,
    DeltaToolCalls,
    FunctionModel,
)

SERIES = {
    "dataset_id": "acs5_ts_household_income",
    "location_ids": ["50001", "50007"],
}
CHART = {
    "kind": "line",
    "title": "Median household income, Addison vs. Chittenden County",
    "data": {"tool": "get_timeseries", "args": SERIES},
    "x": "year",
    "y": "median_household_income",
    "series": "name",
    "y_label": "USD (not inflation-adjusted)",
    "note": "ACS 5-year estimates; each year is a rolling 5-year period.",
}
ANSWER = (
    "This is the **demo model**, so the answer is scripted. Median household "
    "income has risen in both counties since 2011, with Chittenden County "
    "consistently higher than Addison County. The chart above draws every year "
    "from the warehouse by reference.\n\n"
    "Source: ACS 5-year estimates (`acs5_ts_household_income`). Dollar values "
    "are not adjusted for inflation."
)


def _tool_returns_this_turn(messages: list[ModelMessage]) -> int:
    count = 0
    for message in reversed(messages):
        if not isinstance(message, ModelRequest):
            continue
        if any(isinstance(part, UserPromptPart) for part in message.parts):
            break
        count += sum(isinstance(part, ToolReturnPart) for part in message.parts)
    return count


async def _stream(
    messages: list[ModelMessage], _info: AgentInfo
) -> AsyncIterator[str | DeltaToolCalls]:
    step = _tool_returns_this_turn(messages)
    if step == 0:
        yield {
            0: DeltaToolCall(
                name="get_timeseries",
                json_args=json.dumps(SERIES),
                tool_call_id="demo-1",
            )
        }
    elif step == 1:
        yield {
            0: DeltaToolCall(
                name="render_chart", json_args=json.dumps(CHART), tool_call_id="demo-2"
            )
        }
    else:
        for i, word in enumerate(ANSWER.split(" ")):
            yield word if i == 0 else " " + word


def demo_model() -> FunctionModel:
    return FunctionModel(stream_function=_stream, model_name="demo")
