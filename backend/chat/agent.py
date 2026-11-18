"""The data chat agent: read-only data tools plus a reference-based chart tool."""

from __future__ import annotations

import asyncio
import json
import logging
import time
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
    ToolCallPart,
    ToolReturn,
    ToolReturnPart,
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
from chat.config import PROVIDER_ROUTING, ChatSettings, model_name
from data_tools.models import TOOL_DESCRIPTIONS, TOOL_MODELS
from data_tools.service import DataToolService

logger = logging.getLogger(__name__)
# One line per turn with counts and cost, never the question or the answer:
# the only record of real usage until there is a spend ledger. The router
# gives it a handler, since the API configures no INFO logging of its own.
usage_log = logging.getLogger("chat.usage")

# export_data returns inline CSV, which the browser gets by reference instead.
AGENT_DATA_TOOLS = tuple(name for name in TOOL_MODELS if name != "export_data")

# How the agent learns which datasets exist. Normally they are listed in the
# instructions (dataset_catalog); FIND_WITH_TOOL is the fallback when the
# warehouse couldn't be read at startup.
FIND_IN_PROMPT = """\
- The datasets are listed above. Pick from that list, then use
  describe_dataset and search_variables or search_locations before querying.
  Use returned identifiers exactly."""
FIND_WITH_TOOL = """\
- Start with list_datasets, then describe_dataset and search_variables or
  search_locations before querying. Use returned identifiers exactly."""

INTRO = """\
You answer questions about Vermont public data (housing, demographics, economy,
health, zoning, flood hazard, wastewater) for planners, select boards,
developers, and reporters. Write plainly for non-technical readers.
"""

RULES = """\
Finding data:
{find}
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

Follow-up questions: earlier answers keep the tool calls they made but not
their rows. Those calls returned data, and the figures in earlier answers came
from it: don't doubt or retract them just because the rows aren't shown here.
Reuse their dataset ids, location ids, filters, and chart references instead of
searching again, and call a tool again for values the earlier answer doesn't
state. To change a chart the user has seen, call render_chart again with the
earlier spec adjusted.

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


# Past this many gaps, list the years that exist instead. The historic census
# series have over 200 "missing" years between 1791 and 2020; a gap count made
# complete decennial data read as spotty, while [1791, 1800, ..., 2020] shows
# the pattern in about 140 characters.
MAX_GAPS_LISTED = 10


def compact_datasets(result: dict[str, Any]) -> dict[str, Any]:
    """Trim list_datasets to what the model needs to pick a dataset.

    The full listing repeats the same caveats on most datasets and carries
    lineage and column plumbing that describe_dataset also returns. The model
    reads this result on every later request of the turn, so its size is paid
    for many times over. Caveats shared by several datasets are stated once
    and referenced by key; nothing a reader needs is dropped.
    """
    datasets = result.get("datasets")
    if not isinstance(datasets, list):
        return result
    counts: dict[str, int] = {}
    for dataset in datasets:
        for caveat in dataset.get("caveats", []):
            counts[caveat] = counts.get(caveat, 0) + 1
    shared = {
        caveat: f"C{i}"
        for i, caveat in enumerate((c for c, n in counts.items() if n > 1), start=1)
    }
    compact = []
    for dataset in datasets:
        caveats = dataset.get("caveats", [])
        gaps = dataset.get("gaps") or []
        entry = {
            "dataset_id": dataset.get("dataset_id"),
            "label": dataset.get("label"),
            "description": dataset.get("description"),
            "source": (dataset.get("source") or {}).get("name"),
            "kind": dataset.get("kind"),
            # Record datasets (zoning, wastewater) have no year.
            "years": [dataset["year_min"], dataset.get("year_max")]
            if dataset.get("year_min") is not None
            else None,
            "gaps": gaps if len(gaps) <= MAX_GAPS_LISTED else None,
            "years_available": dataset.get("years_available")
            if len(gaps) > MAX_GAPS_LISTED
            else None,
            "geo_type": dataset.get("fixed_geo_type"),
            "variable_columns": dataset.get("variable_columns"),
            # Margin columns are covered by the shared caveat that explains them.
            "value_columns": {
                column: unit
                for column, unit in (dataset.get("value_columns") or {}).items()
                if not column.endswith("_moe")
            },
            "shared_caveats": [shared[c] for c in caveats if c in shared],
            "caveats": [c for c in caveats if c not in shared],
            "available": None if dataset.get("available", True) else False,
        }
        compact.append({k: v for k, v in entry.items() if v not in (None, [], {})})
    return {
        "datasets": compact,
        "shared_caveats": {key: caveat for caveat, key in shared.items()},
        "warehouse_version": result.get("warehouse_version"),
    }


def dataset_catalog(service: DataToolService) -> str | None:
    """The compact dataset list as text for the instructions.

    Every question needs this list, so it goes in the prompt instead of
    behind a tool call: that saves a model request per question (models
    often made the call two or three times), and as part of the fixed prefix
    it is read from cache by every later request and question. None if the
    warehouse can't be read right now; the agent then keeps list_datasets.
    """
    try:
        listing = compact_datasets(service.call("list_datasets", {}))
    except Exception as exc:  # noqa: BLE001 -- chat still starts, with the tool
        logger.error("Chat couldn't list datasets (%s)", type(exc).__name__)
        return None
    return json.dumps(listing, separators=(",", ":"), default=str)


def instructions(catalog: str | None) -> str:
    """The dataset list goes before the rules, not after them. With the list
    last, the rules sat ahead of 20,000 characters of JSON, and the eval
    scored 86% against 89% with the rules last
    (docs/reports/chat-eval-history.md, 2026-11-13)."""
    if catalog is None:
        return f"{INTRO}\n{RULES.format(find=FIND_WITH_TOOL)}"
    return (
        f"{INTRO}\nDatasets (shared_caveats keys refer to the map of that name; "
        "describe_dataset returns columns, filter values, and year coverage):\n"
        f"{catalog}\n\n{RULES.format(find=FIND_IN_PROMPT)}"
    )


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
            if name == "list_datasets":
                return compact_datasets(result)
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
        model_settings["openrouter_provider"] = PROVIDER_ROUTING
        # One question is several model requests, each re-sending the tool
        # definitions, the instructions, and every earlier tool result. Mark
        # all three as cacheable so later requests read that prefix at the
        # cached rate. Providers without explicit cache control ignore these.
        model_settings["openrouter_cache_tool_definitions"] = True
        model_settings["openrouter_cache_instructions"] = True
        model_settings["openrouter_cache_messages"] = True
    # Built once: computing it per request would put it after the cached part
    # of the instructions. A replaced warehouse shows here after a restart
    # (describe_dataset always reads the live one).
    catalog = dataset_catalog(service)
    tools = [
        data_tool(service, name, settings.preview_rows)
        for name in AGENT_DATA_TOOLS
        if catalog is None or name != "list_datasets"
    ]
    tools.append(rank_tool(service, settings))
    tools.append(chart_tool(service, settings))
    return Agent(
        model,
        instructions=instructions(catalog),
        tools=tools,
        # Let the API start without a provider key; requests report the problem.
        defer_model_check=True,
        model_settings=model_settings,
    )


# How providers say a spend limit is used up when they don't answer 402:
# OpenRouter can send 403 with metadata.limit_source "openrouter_key_limit",
# and OpenAI sends 429 with code "project_spend_limit_exceeded" (or
# "organization_..."). Without these, the first reads as "not configured" and
# the second as "busy, try again".
SPEND_LIMIT_MARKERS = ("openrouter_key_limit", "spend_limit_exceeded")


def spend_limit_reached(status: int, body: object = None) -> bool:
    if status == 402:
        return True
    text = json.dumps(body, default=str) if body is not None else ""
    return any(marker in text for marker in SPEND_LIMIT_MARKERS)


def http_error_message(status: int, body: object = None) -> str:
    """What to tell the user when the model provider answers with an error."""
    if spend_limit_reached(status, body):
        # The provider key's credit limit is spent: the spend backstop until
        # we have a ledger of our own.
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


# The tool calls history may replay: the agent's own tools, so the client
# can't name anything else. Not list_datasets: the dataset list is normally in
# the instructions and the tool is absent, and chats saved before that change
# still carry the call.
AGENT_TOOLS = frozenset(
    {*AGENT_DATA_TOOLS, "rank_rows", "render_chart"} - {"list_datasets"}
)

# What an earlier tool call "returned" when it is replayed from history. Rows
# are never kept between turns: the client would have to hold and re-send
# them, and the warehouse can answer the same call again.
# Worded as a success: a bare "result not kept" read as a call that returned
# nothing, and the model retracted the earlier answer's figures as made up.
HISTORY_RESULT = (
    "This call returned data, and the answer that follows was based on it. "
    "Its rows weren't kept; call again only for values that answer doesn't state."
)
HISTORY_CHART = "The chart was shown to the user."

# Place lookups are the exception: they are re-run and replayed with their top
# matches. Their arguments alone don't say which id is which town, so with a
# placeholder the model looked every place up again on each follow-up (evals,
# 2026-11-16). A match is a name and an id, so this stays small; the newest
# few lookups are re-run, at about 50-100 ms each.
LOOKUP_MATCHES = 5
MAX_REPLAYED_LOOKUPS = 6


def replayed_lookup(service: DataToolService, args: dict[str, Any]) -> Any:
    try:
        result = service.call("search_locations", args)
    except Exception:  # noqa: BLE001 -- fall back to the placeholder
        return HISTORY_RESULT
    return {
        "locations": [
            {key: place.get(key) for key in ("id", "name", "geo_type")}
            for place in result.get("locations", [])[:LOOKUP_MATCHES]
        ]
    }


def to_history(
    messages: list[dict[str, Any]], service: DataToolService | None = None
) -> list[ModelMessage]:
    """Rebuild history from the client's messages.

    An assistant message may carry the tool calls its answer made (name and
    arguments). They are replayed as real tool calls with a placeholder result,
    so a follow-up ("how does Rutland compare?", "make that a bar chart") can
    reuse the dataset, places, and chart spec without discovering them again.
    With a service, the newest place lookups are replayed with their matches.
    """
    lookups = [
        (index, n)
        for index, message in enumerate(messages)
        if message["role"] == "assistant"
        for n, tool in enumerate(message.get("tools") or [])
        if tool["name"] == "search_locations"
    ]
    rerun = set(lookups[-MAX_REPLAYED_LOOKUPS:]) if service else set()

    def result(index: int, n: int, tool: dict[str, Any]) -> Any:
        if tool["name"] == "render_chart":
            return HISTORY_CHART
        if (index, n) in rerun:
            return replayed_lookup(service, tool["args"])
        return HISTORY_RESULT

    history: list[ModelMessage] = []
    for index, message in enumerate(messages):
        if message["role"] == "user":
            history.append(
                ModelRequest(parts=[UserPromptPart(content=message["content"])])
            )
            continue
        tools = message.get("tools") or []
        if tools:
            ids = [f"history_{index}_{n}" for n in range(len(tools))]
            history.append(
                ModelResponse(
                    parts=[
                        ToolCallPart(
                            tool_name=tool["name"],
                            args=tool["args"],
                            tool_call_id=call_id,
                        )
                        for tool, call_id in zip(tools, ids, strict=True)
                    ]
                )
            )
            history.append(
                ModelRequest(
                    parts=[
                        ToolReturnPart(
                            tool_name=tool["name"],
                            content=result(index, n, tool),
                            tool_call_id=call_id,
                        )
                        for n, (tool, call_id) in enumerate(
                            zip(tools, ids, strict=True)
                        )
                    ]
                )
            )
        history.append(ModelResponse(parts=[TextPart(content=message["content"])]))
    return history


def log_turn(model: str, outcome: str, usage: dict[str, Any], seconds: float) -> None:
    usage_log.info(
        "chat_turn outcome=%s model=%s seconds=%.1f requests=%s tool_calls=%s "
        "input_tokens=%s output_tokens=%s cost_usd=%s",
        outcome,
        model,
        seconds,
        *(
            usage.get(key)
            for key in (
                "requests",
                "tool_calls",
                "input_tokens",
                "output_tokens",
                "cost_usd",
            )
        ),
    )


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
    started = time.monotonic()
    # "stopped" unless the turn finishes or fails: the reader went away.
    outcome = "stopped"
    usage: dict[str, Any] = {}
    try:
        # A stalled provider would otherwise hold the stream open until the
        # proxy gives up; evals saw chats hang for minutes.
        async with (
            asyncio.timeout(settings.turn_timeout),
            agent.run_stream_events(
                prompt, message_history=history, usage_limits=limits
            ) as events,
        ):
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
                    run_usage = event.result.usage
                    usage = {
                        "requests": run_usage.requests,
                        "tool_calls": run_usage.tool_calls,
                        "input_tokens": run_usage.input_tokens,
                        "output_tokens": run_usage.output_tokens,
                        # Part of input_tokens; shows whether caching works.
                        "cache_read_tokens": run_usage.cache_read_tokens,
                        "cache_write_tokens": run_usage.cache_write_tokens,
                        "cost_usd": turn_cost(event.result.new_messages()),
                    }
                    outcome = "ok"
                    yield {"type": "done", "usage": usage}
    except UsageLimitExceeded:
        outcome = "step_limit"
        yield {
            "type": "error",
            "message": "This question needed more steps than one answer allows. "
            "Try asking something narrower.",
        }
    except TimeoutError:
        outcome = "timeout"
        yield {
            "type": "error",
            "message": "That took too long to answer. Try again, or ask "
            "something narrower.",
        }
    except UserError as exc:
        # Usually a missing provider API key or an unknown model name.
        outcome = "not_configured"
        logger.error("Chat model configuration error: %s", exc)
        yield {"type": "error", "message": "Chat isn't configured on this server yet."}
    except ModelHTTPError as exc:
        # The status says what to do: limit reached, busy, misconfigured, or
        # down. The body can hold provider details, so it isn't logged.
        limit = spend_limit_reached(exc.status_code, exc.body)
        outcome = "spend_limit" if limit else f"http_{exc.status_code}"
        logger.error(
            "Chat model request failed: HTTP %s from %s",
            exc.status_code,
            exc.model_name,
        )
        yield {
            "type": "error",
            "message": http_error_message(exc.status_code, exc.body),
        }
    except ModelAPIError as exc:
        outcome = "provider_error"
        logger.error("Chat model request failed (%s)", type(exc).__name__)
        yield {
            "type": "error",
            "message": "The language model service is unavailable. Try again shortly.",
        }
    except Exception as exc:  # noqa: BLE001 -- the stream must end with a readable event
        outcome = "error"
        logger.error("Chat turn failed (%s)", type(exc).__name__)
        yield {"type": "error", "message": "Something went wrong answering that."}
    finally:
        log_turn(settings.model, outcome, usage, time.monotonic() - started)
