"""The data chat agent: read-only data tools plus a reference-based chart tool."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from typing import Any

from pydantic import ValidationError
from pydantic_ai import (
    Agent,
    AgentRunResultEvent,
    FunctionToolCallEvent,
    FunctionToolResultEvent,
    ModelMessage,
    ModelRequest,
    ModelResponse,
    PartDeltaEvent,
    PartStartEvent,
    TextPart,
    TextPartDelta,
    Tool,
    ToolReturn,
    UsageLimitExceeded,
    UsageLimits,
    UserPromptPart,
)
from pydantic_ai.exceptions import ModelAPIError, ModelHTTPError, UserError

from chat.charts import (
    FILTERS_HINT,
    ChartSpec,
    DataRef,
    check_columns,
    normalize_filters,
    overlapping_rows,
    resolve_rows,
)
from chat.config import ChatSettings, model_name
from data_tools.models import TOOL_DESCRIPTIONS, TOOL_MODELS
from data_tools.service import DataToolService

logger = logging.getLogger(__name__)

# export_data returns inline CSV, which the browser gets by reference instead.
AGENT_DATA_TOOLS = tuple(name for name in TOOL_MODELS if name != "export_data")

INSTRUCTIONS = """\
You answer questions about Vermont public data (housing, demographics, economy,
health, zoning, flood hazard, wastewater) for planners, select boards,
developers, and reporters. Write plainly for non-technical readers.

Finding data:
- Start with list_datasets, then describe_dataset and search_variables or
  search_locations before querying. Use returned identifiers exactly.
- Keep geography, year, measure, and units consistent when comparing places.
  Never average medians, interpolate missing years, or invent values. If the
  data can't answer the question, say so and suggest what it can answer.

Tool results show you only a preview of rows. That is enough to describe the
data; you don't need every row, and you shouldn't page through results with
next_cursor to see them all.

Rankings ("top 10 towns by...", "which county has the lowest..."): call
rank_rows once with the query reference plus sort_by and top. It sorts every
row for you. Filter to one year and one geography level first so each place
appears once.

Charts and tables:
- To show a trend, comparison, or breakdown, call render_chart instead of
  listing many numbers. Its data field is a reference: the same data tool and
  arguments you already called (query_data, get_timeseries, compare_places, or
  get_zoning_summary), without limit or cursor. The app re-runs that reference
  to draw every row, so never copy rows into it.
- Pick the kind that fits: line for change over years, bar to compare places
  or categories, stacked_bar or area for parts of a whole (age groups,
  sectors, tenure), and table for detailed rows the reader may want to scan.
  Prefer a table to a long markdown table.
- x, y, series, and columns must be column names from that tool's result.
  Each x (and series) value must match one row: in long tables with section,
  variable, measure, or quarter columns, filter to the rows you mean.
- To chart a ranking, reuse the rank_rows reference (with sort_by and top) as
  the chart's data.

Answers:
- Lead with a one-sentence answer, then only the key numbers with their year
  and units. Aim for under 150 words; the reader can ask a follow-up.
- Bold at most that first sentence. Don't bold numbers, names, or labels.
- Charts and tables already show their own title, note, and source, so don't
  repeat those details or restate their rows in text.
- End with one short line naming the source dataset. Mention only the caveats
  that change how to read the answer (gaps, small samples, margins of error).
- Use a small markdown table only for a few values; otherwise render a table.
"""


def tool_error(exc: Exception, tool_name: str) -> str:
    """A message safe to show the model and the user; hides internals."""
    if isinstance(exc, ValidationError):
        return "; ".join(
            f"{'.'.join(map(str, item['loc'])) or 'arguments'}: {item['msg']}"
            for item in exc.errors(include_input=False, include_url=False)
        )
    if isinstance(exc, TimeoutError):
        return "The query timed out; narrow your filters and retry"
    if isinstance(exc, ValueError):
        return str(exc)
    # Do not put SQL, filesystem paths, or data into logs or results.
    logger.error("Chat tool %s failed (%s)", tool_name, type(exc).__name__)
    return "Data is temporarily unavailable; retry later"


def preview(result: dict[str, Any], rows_shown: int) -> dict[str, Any]:
    """Trim a data tool result to the rows the model needs to see."""
    rows = result.get("rows")
    if not isinstance(rows, list) or len(rows) <= rows_shown:
        return result
    return {
        **result,
        "rows": rows[:rows_shown],
        "rows_shown_to_you": rows_shown,
        "preview_note": (
            f"Only the first {rows_shown} of {len(rows)} rows on this page are "
            "shown. To rank them, use rank_rows; to chart them, pass this tool "
            "and arguments to render_chart as the data reference."
        ),
    }


def agent_schema(name: str) -> dict[str, Any]:
    """A data tool's schema with the filter format spelled out for models."""
    schema = TOOL_MODELS[name].model_json_schema()
    filters = schema.get("properties", {}).get("filters")
    if filters is not None:
        filters["description"] = f"{filters.get('description', '')} {FILTERS_HINT}"
    return schema


def data_tool(service: DataToolService, name: str, rows_shown: int) -> Tool:
    def call(**arguments: Any) -> dict[str, Any]:
        try:
            result = service.call(name, normalize_filters(arguments))
            return preview(result, rows_shown)
        except Exception as exc:  # noqa: BLE001 -- the model gets a safe message
            return {"error": tool_error(exc, name)}

    return Tool.from_schema(
        call,
        name=name,
        description=TOOL_DESCRIPTIONS[name],
        json_schema=agent_schema(name),
    )


def chart_tool(service: DataToolService, settings: ChatSettings) -> Tool:
    def render_chart(**arguments: Any) -> ToolReturn | dict[str, Any]:
        try:
            spec = ChartSpec.model_validate(arguments)
            resolved = resolve_rows(service, spec.data, settings.chart_max_rows)
        except Exception as exc:  # noqa: BLE001 -- the model gets a safe message
            return {"error": tool_error(exc, "render_chart")}
        missing = check_columns(spec, resolved["columns"])
        if missing:
            return {
                "error": f"Columns not in the referenced result: {', '.join(missing)}",
                "available_columns": resolved["columns"],
            }
        if not resolved["rows"]:
            return {"error": "The referenced query returned no rows; nothing to chart"}
        overlap = overlapping_rows(spec, resolved["rows"])
        if overlap is not None:
            point = f"{spec.x} and {spec.series}" if spec.series else spec.x
            hint = (
                f"They differ in: {', '.join(overlap)}. Filter to one value of "
                "those columns, or use one as the series."
                if overlap
                else "They are exact copies; report this as a data problem."
            )
            return {
                "error": f"Several rows share the same {point}, so the chart would "
                f"hide some of them. {hint}"
            }
        return ToolReturn(
            return_value={
                "rendered": True,
                "row_count": len(resolved["rows"]),
                "truncated": resolved["truncated"],
            },
            # Sent to the browser, not the model.
            metadata={"chart": spec.model_dump(mode="json")},
        )

    return Tool.from_schema(
        render_chart,
        name="render_chart",
        description=(
            "Show the user a chart or table. The data field references a data "
            "tool call you already made; the app re-runs it to draw every row."
        ),
        json_schema=ChartSpec.model_json_schema(),
    )


def rank_tool(service: DataToolService, settings: ChatSettings) -> Tool:
    def rank_rows(**arguments: Any) -> dict[str, Any]:
        try:
            ref = DataRef.model_validate(arguments)
            if not ref.sort_by:
                return {"error": "rank_rows needs sort_by"}
            resolved = resolve_rows(
                service, ref.model_copy(update={"top": None}), settings.chart_max_rows
            )
        except Exception as exc:  # noqa: BLE001 -- the model gets a safe message
            return {"error": tool_error(exc, "rank_rows")}
        top = ref.top or 10
        return {
            "rows": resolved["rows"][:top],
            "rows_ranked": len(resolved["rows"]),
            "columns": resolved["columns"],
            "units": resolved["units"],
            "provenance": resolved["provenance"],
            "warehouse_version": resolved["warehouse_version"],
        }

    return Tool.from_schema(
        rank_rows,
        name="rank_rows",
        description=(
            "Rank every row of a query_data, get_timeseries, or compare_places "
            "result by one column and return the top N (default 10). Use this "
            "for top/bottom questions instead of paging through results."
        ),
        json_schema=DataRef.model_json_schema(),
    )


def build_agent(settings: ChatSettings, service: DataToolService) -> Agent:
    model: Any = model_name(settings.model)
    model_settings: dict[str, Any] = {"max_tokens": settings.max_output_tokens}
    if model == "demo":
        from chat.demo import demo_model

        model = demo_model()
    elif model.startswith("openrouter:"):
        # Ask OpenRouter to report each response's cost (see turn_cost).
        model_settings["openrouter_usage"] = {"include": True}
    tools = [
        data_tool(service, name, settings.preview_rows) for name in AGENT_DATA_TOOLS
    ]
    tools.append(rank_tool(service, settings))
    tools.append(chart_tool(service, settings))
    return Agent(
        model,
        instructions=INSTRUCTIONS,
        tools=tools,
        # Let the API start without a provider key; requests report the problem.
        defer_model_check=True,
        model_settings=model_settings,
    )


def http_error_message(status: int) -> str:
    """What to tell the user when the model provider answers with an error."""
    if status == 402:
        # OpenRouter's reply once the key's credit limit is spent: the spend
        # backstop until we have a ledger of our own.
        return "Data Chat has reached its usage limit for now. Try again later."
    if status in (401, 403, 404):
        return "Chat isn't configured on this server yet."
    if status in (408, 429):
        return "The language model is busy right now. Try again in a minute."
    if status < 500:
        return "The language model couldn't handle that request. Try rephrasing it or starting a new chat."
    return "The language model service is unavailable. Try again shortly."


def turn_cost(messages: list[ModelMessage]) -> float | None:
    """Dollars OpenRouter reported for the responses of one run, if any."""
    costs = [
        m.provider_details["cost"]
        for m in messages
        if isinstance(m, ModelResponse) and (m.provider_details or {}).get("cost")
    ]
    return round(sum(costs), 6) if costs else None


def to_history(messages: list[dict[str, str]]) -> list[ModelMessage]:
    """Rebuild text-only history from the client; tool calls aren't replayed."""
    history: list[ModelMessage] = []
    for message in messages:
        if message["role"] == "user":
            history.append(
                ModelRequest(parts=[UserPromptPart(content=message["content"])])
            )
        else:
            history.append(ModelResponse(parts=[TextPart(content=message["content"])]))
    return history


async def stream_answer(
    agent: Agent,
    settings: ChatSettings,
    prompt: str,
    history: list[ModelMessage],
) -> AsyncIterator[dict[str, Any]]:
    """Run one turn and yield browser events (see the protocol in router.py)."""
    limits = UsageLimits(
        request_limit=settings.max_model_requests,
        tool_calls_limit=settings.max_tool_calls,
        output_tokens_limit=settings.max_output_tokens,
    )
    try:
        async with agent.run_stream_events(
            prompt, message_history=history, usage_limits=limits
        ) as events:
            async for event in events:
                if isinstance(event, PartStartEvent) and isinstance(
                    event.part, TextPart
                ):
                    if event.part.content:
                        yield {"type": "text", "delta": event.part.content}
                elif isinstance(event, PartDeltaEvent) and isinstance(
                    event.delta, TextPartDelta
                ):
                    yield {"type": "text", "delta": event.delta.content_delta}
                elif isinstance(event, FunctionToolCallEvent):
                    yield {
                        "type": "tool_call",
                        "id": event.part.tool_call_id,
                        "name": event.part.tool_name,
                        "args": event.part.args_as_dict(),
                    }
                elif isinstance(event, FunctionToolResultEvent):
                    part = event.part
                    content = getattr(part, "content", None)
                    ok = not (isinstance(content, dict) and "error" in content)
                    yield {
                        "type": "tool_result",
                        "id": part.tool_call_id,
                        "name": part.tool_name,
                        "ok": ok,
                        "error": None if ok else content["error"],
                    }
                    chart = (getattr(part, "metadata", None) or {}).get("chart")
                    if chart:
                        yield {"type": "chart", "id": part.tool_call_id, "chart": chart}
                elif isinstance(event, AgentRunResultEvent):
                    usage = event.result.usage
                    yield {
                        "type": "done",
                        "usage": {
                            "requests": usage.requests,
                            "tool_calls": usage.tool_calls,
                            "input_tokens": usage.input_tokens,
                            "output_tokens": usage.output_tokens,
                            "cost_usd": turn_cost(event.result.new_messages()),
                        },
                    }
    except UsageLimitExceeded:
        yield {
            "type": "error",
            "message": "This question needed more steps than one answer allows. "
            "Try asking something narrower.",
        }
    except UserError as exc:
        # Usually a missing provider API key or an unknown model name.
        logger.error("Chat model configuration error: %s", exc)
        yield {"type": "error", "message": "Chat isn't configured on this server yet."}
    except ModelHTTPError as exc:
        # The status says what to do: limit reached, busy, misconfigured, or
        # down. The body can hold provider details, so it isn't logged.
        logger.error(
            "Chat model request failed: HTTP %s from %s",
            exc.status_code,
            exc.model_name,
        )
        yield {"type": "error", "message": http_error_message(exc.status_code)}
    except ModelAPIError as exc:
        logger.error("Chat model request failed (%s)", type(exc).__name__)
        yield {
            "type": "error",
            "message": "The language model service is unavailable. Try again shortly.",
        }
    except Exception as exc:  # noqa: BLE001 -- the stream must end with a readable event
        logger.error("Chat turn failed (%s)", type(exc).__name__)
        yield {"type": "error", "message": "Something went wrong answering that."}
