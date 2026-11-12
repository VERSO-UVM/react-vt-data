"""Data chat tests use a tiny warehouse and the scripted demo model, never a real LLM."""

import asyncio
import json

import duckdb
import httpx2
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError
from pydantic_ai import ToolReturn
from pydantic_ai.exceptions import ModelHTTPError
from pydantic_ai.models.function import FunctionModel
from pydantic_ai.models.openrouter import OpenRouterModel
from pydantic_ai.providers.openrouter import OpenRouterProvider

from chat import access
from chat.agent import (
    build_agent,
    chart_tool,
    compact_datasets,
    preview,
    rank_tool,
    stream_answer,
)
from chat.charts import ChartSpec, DataRef, overlapping_rows, resolve_rows
from chat.config import ChatSettings
from chat.demo import CHART
from chat.router import UNLOCK_ATTEMPTS, ChatMessage, bounded_history, create_router
from data_tools.service import DataToolService

INCOME = "acs5_ts_household_income"


@pytest.fixture
def warehouse(tmp_path):
    path = tmp_path / "warehouse.duckdb"
    with duckdb.connect(str(path)) as conn:
        conn.execute("CREATE TABLE vt_county_geoids(NAME VARCHAR, GEOID VARCHAR)")
        conn.execute(
            "INSERT INTO vt_county_geoids VALUES ('Addison County, Vermont', '50001'), ('Chittenden County, Vermont', '50007')"
        )
        conn.execute(
            "CREATE TABLE acs5Economics_medianHouseholdIncome_timeseries(year VARCHAR, name VARCHAR, median_household_income DOUBLE, geo_type VARCHAR)"
        )
        conn.execute(
            "INSERT INTO acs5Economics_medianHouseholdIncome_timeseries VALUES ('2021', 'Addison County, Vermont', 61000, 'county'), ('2022', 'Addison County, Vermont', 64000, 'county'), ('2023', 'Addison County, Vermont', 68000, 'county'), ('2021', 'Chittenden County, Vermont', 71000, 'county'), ('2022', 'Chittenden County, Vermont', 75000, 'county')"
        )
        conn.execute(
            "CREATE TABLE acs5_housing_tidy(year VARCHAR, name VARCHAR, geo_type VARCHAR, section VARCHAR, variable VARCHAR, value DOUBLE, percent DOUBLE)"
        )
        conn.execute(
            "INSERT INTO acs5_housing_tidy VALUES ('2022', 'Addison County, Vermont', 'county', 'Tenure', 'Owner occupied', 10000, 70), ('2022', 'Addison County, Vermont', 'county', 'Tenure', 'Renter occupied', 4000, 30), ('2023', 'Addison County, Vermont', 'county', 'Tenure', 'Owner occupied', 10200, 71), ('2023', 'Addison County, Vermont', 'county', 'Tenure', 'Renter occupied', 4100, 29)"
        )
        conn.execute(
            "CREATE TABLE VersoZoning_info(object_id INTEGER, county VARCHAR, town VARCHAR, geoid VARCHAR, district_name VARCHAR, district_type VARCHAR, overlay_district VARCHAR, acres DOUBLE)"
        )
        conn.execute(
            "INSERT INTO VersoZoning_info VALUES (1, 'Addison', 'Addison', '5000100325', 'R1', 'Residential', 'No', 100), (2, 'Addison', 'Addison', '5000100325', 'C1', 'Commercial', 'No', 50)"
        )
    return path


@pytest.fixture
def service(warehouse):
    return DataToolService(warehouse)


def make_client(warehouse, **overrides):
    settings = ChatSettings(model="demo", warehouse_path=warehouse, **overrides)
    app = FastAPI()
    app.include_router(create_router(settings), prefix="/api")
    return TestClient(app)


def stream_events(response):
    return [
        json.loads(line.removeprefix("data: "))
        for line in response.text.splitlines()
        if line.startswith("data: ")
    ]


def ask(client, question="How has income changed?"):
    return client.post(
        "/api/chat", json={"messages": [{"role": "user", "content": question}]}
    )


def test_preview_trims_rows_for_the_model():
    result = {"rows": [{"n": i} for i in range(50)], "row_count": 50}
    trimmed = preview(result, 5)
    assert len(trimmed["rows"]) == 5
    assert trimmed["rows_shown_to_you"] == 5
    assert "render_chart" in trimmed["preview_note"]
    small = {"rows": [{"n": 1}]}
    assert preview(small, 5) is small


def test_dataset_list_is_compact_and_states_shared_caveats_once(service):
    full = service.call("list_datasets", {})
    compact = compact_datasets(full)
    assert [d["dataset_id"] for d in compact["datasets"]] == [
        d["dataset_id"] for d in full["datasets"]
    ]
    assert len(json.dumps(compact)) < len(json.dumps(full, default=str)) / 2
    income = next(d for d in compact["datasets"] if d["dataset_id"] == INCOME)
    # Enough to query a wide series without describing it first.
    assert "median_household_income" in income["value_columns"]
    assert not any(c.endswith("_moe") for c in income["value_columns"])
    assert "warehouse_table" not in income
    # Every caveat survives, either on the dataset or once in the shared map.
    for before, after in zip(full["datasets"], compact["datasets"], strict=True):
        kept = after.get("caveats", []) + [
            compact["shared_caveats"][key] for key in after.get("shared_caveats", [])
        ]
        assert sorted(kept) == sorted(before["caveats"])
    assert all(
        sum(c in d["caveats"] for d in full["datasets"]) > 1
        for c in compact["shared_caveats"].values()
    )


def test_data_ref_drops_paging_and_validates_tool_args():
    ref = DataRef(
        tool="get_timeseries",
        args={"dataset_id": INCOME, "limit": 3, "cursor": "abc"},
    )
    assert ref.args == {"dataset_id": INCOME}
    with pytest.raises(ValidationError):
        DataRef(tool="get_timeseries", args={"dataset_id": INCOME, "bogus": 1})
    with pytest.raises(ValidationError):
        DataRef(tool="list_datasets", args={})


def test_resolve_rows_follows_every_page(warehouse):
    paged = DataToolService(warehouse, max_rows=2)
    ref = DataRef(tool="get_timeseries", args={"dataset_id": INCOME})
    resolved = resolve_rows(paged, ref, max_rows=100)
    assert len(resolved["rows"]) == 5
    assert resolved["truncated"] is False
    capped = resolve_rows(paged, ref, max_rows=3)
    assert len(capped["rows"]) == 3
    assert capped["truncated"] is True


def test_data_ref_ranks_every_row_then_keeps_top(warehouse):
    paged = DataToolService(warehouse, max_rows=2)
    ref = DataRef(
        tool="get_timeseries",
        args={"dataset_id": INCOME},
        sort_by="median_household_income",
        top=2,
    )
    rows = resolve_rows(paged, ref, max_rows=100)["rows"]
    # The two largest values sit on different pages of the paged service.
    assert [r["median_household_income"] for r in rows] == [75000, 71000]
    lowest = resolve_rows(
        paged, ref.model_copy(update={"descending": False, "top": 1}), 100
    )["rows"]
    assert lowest[0]["median_household_income"] == 61000


def test_ranking_refuses_unknown_columns_and_partial_results(service):
    ref = DataRef(tool="get_timeseries", args={"dataset_id": INCOME}, sort_by="nope")
    with pytest.raises(ValueError, match="Can't sort by nope"):
        resolve_rows(service, ref, max_rows=100)
    partial = DataRef(
        tool="get_timeseries",
        args={"dataset_id": INCOME},
        sort_by="median_household_income",
    )
    with pytest.raises(ValueError, match="narrow the filters"):
        resolve_rows(service, partial, max_rows=3)


def test_rank_tool_returns_top_rows_to_the_model(service):
    tool = rank_tool(service, ChatSettings())
    result = tool.function(
        tool="get_timeseries",
        args={"dataset_id": INCOME},
        sort_by="median_household_income",
        top=3,
    )
    assert result["rows_ranked"] == 5
    assert len(result["rows"]) == 3
    assert result["rows"][0]["median_household_income"] == 75000
    assert (
        "sort_by"
        in tool.function(tool="get_timeseries", args={"dataset_id": INCOME})["error"]
    )


def test_chart_tool_returns_spec_to_browser_not_model(service):
    tool = chart_tool(service, ChatSettings())
    result = tool.function(**CHART)
    assert isinstance(result, ToolReturn)
    assert result.return_value["row_count"] == 5
    assert result.metadata["chart"]["data"]["tool"] == "get_timeseries"
    assert "rows" not in result.return_value


def test_chart_tool_reports_unknown_columns(service):
    tool = chart_tool(service, ChatSettings())
    result = tool.function(**{**CHART, "y": "not_a_column"})
    assert "not_a_column" in result["error"]
    assert "median_household_income" in result["available_columns"]


def test_bounded_history_keeps_newest_turns_starting_with_user():
    settings = ChatSettings(max_history_messages=3)
    messages = [
        ChatMessage(role=role, content=f"{role} {i}")
        for i, role in enumerate(["user", "assistant"] * 3 + ["user"])
    ]
    question, history = bounded_history(messages, settings)
    assert question == "user 6"
    assert [m["role"] for m in history] == ["user", "assistant"]
    assert history[0]["content"] == "user 4"


def test_status_route(warehouse):
    client = make_client(warehouse)
    response = client.get("/api/chat/status")
    assert response.headers["cache-control"] == "no-store"
    assert response.json() == {
        "enabled": True,
        "available": True,
        "resets_at": None,
        "unlocked": True,
    }


def test_chat_streams_tools_chart_text_and_usage(warehouse):
    response = ask(make_client(warehouse))
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    events = stream_events(response)
    kinds = [e["type"] for e in events]
    assert kinds[-1] == "done"
    calls = [e["name"] for e in events if e["type"] == "tool_call"]
    assert calls == ["get_timeseries", "render_chart"]
    assert all(e["ok"] for e in events if e["type"] == "tool_result")
    (chart,) = [e["chart"] for e in events if e["type"] == "chart"]
    assert chart["y"] == "median_household_income"
    text = "".join(e["delta"] for e in events if e["type"] == "text")
    assert "demo model" in text


def test_chat_data_route_resolves_a_chart_reference(warehouse):
    response = make_client(warehouse).post("/api/chat/data", json=CHART["data"])
    assert response.status_code == 200
    body = response.json()
    assert len(body["rows"]) == 5
    assert "median_household_income" in body["columns"]


def test_chat_data_route_rejects_invalid_references(warehouse):
    client = make_client(warehouse)
    bad_tool = client.post("/api/chat/data", json={"tool": "export_data", "args": {}})
    assert bad_tool.status_code == 422
    unknown = client.post(
        "/api/chat/data",
        json={"tool": "query_data", "args": {"dataset_id": "no_such_dataset"}},
    )
    assert unknown.status_code == 400


def test_last_message_must_be_a_question(warehouse):
    response = make_client(warehouse).post(
        "/api/chat", json={"messages": [{"role": "assistant", "content": "hi"}]}
    )
    assert response.status_code == 422


def test_rate_limit_is_per_client(warehouse):
    client = make_client(warehouse, rate_limit=1)
    assert ask(client).status_code == 200
    limited = ask(client)
    assert limited.status_code == 429
    assert "hourly" in limited.json()["detail"]


def test_chat_needs_the_access_code_when_one_is_set(warehouse):
    client = make_client(warehouse, access_code="maple")
    assert client.get("/api/chat/status").json()["unlocked"] is False
    assert ask(client).status_code == 401
    assert client.post("/api/chat/data", json=CHART["data"]).status_code == 401

    assert client.post("/api/chat/unlock", json={"code": "birch"}).status_code == 403
    unlocked = client.post("/api/chat/unlock", json={"code": " maple "})
    assert unlocked.status_code == 200
    assert unlocked.json()["unlocked"] is True
    cookie = unlocked.headers["set-cookie"]
    assert "HttpOnly" in cookie and "Path=/api/chat" in cookie
    # The test client is plain http, so the cookie can't be Secure.
    assert "Secure" not in cookie

    assert client.get("/api/chat/status").json()["unlocked"] is True
    assert ask(client).status_code == 200
    assert client.post("/api/chat/data", json=CHART["data"]).status_code == 200


def test_access_cookie_is_secure_over_https(warehouse):
    settings = ChatSettings(model="demo", warehouse_path=warehouse, access_code="maple")
    app = FastAPI()
    app.include_router(create_router(settings), prefix="/api")
    client = TestClient(app, base_url="https://testserver")
    response = client.post("/api/chat/unlock", json={"code": "maple"})
    assert "Secure" in response.headers["set-cookie"]


def test_changing_the_code_signs_everyone_out(warehouse):
    old = make_client(warehouse, access_code="maple")
    old.post("/api/chat/unlock", json={"code": "maple"})
    new = make_client(warehouse, access_code="birch")
    new.cookies = old.cookies
    assert new.get("/api/chat/status").json()["unlocked"] is False
    assert ask(new).status_code == 401


def test_unlock_attempts_are_rate_limited_even_for_the_right_code(warehouse):
    client = make_client(warehouse, access_code="maple")
    for _ in range(UNLOCK_ATTEMPTS):
        client.post("/api/chat/unlock", json={"code": "wrong"})
    limited = client.post("/api/chat/unlock", json={"code": "maple"})
    assert limited.status_code == 429
    assert client.get("/api/chat/status").json()["unlocked"] is False


def test_access_tokens_expire_and_reject_tampering():
    token = access.issue_token("maple", max_age=60, now=1_000)
    assert access.token_valid("maple", token, now=1_059)
    assert not access.token_valid("maple", token, now=1_061)
    assert not access.token_valid("birch", token, now=1_000)
    expires, _, signature = token.partition(".")
    assert not access.token_valid(
        "maple", f"{int(expires) + 999}.{signature}", now=1_000
    )
    assert not access.token_valid("maple", "garbage", now=1_000)
    assert not access.token_valid("maple", None)


def test_tool_call_limit_ends_turn_with_a_readable_error(warehouse):
    events = stream_events(ask(make_client(warehouse, max_tool_calls=1)))
    assert events[-1]["type"] == "error"
    assert "narrower" in events[-1]["message"]


TENURE = {"dataset_id": "acs5_housing"}


def test_chart_tool_rejects_rows_that_would_share_a_point(service):
    tool = chart_tool(service, ChatSettings())
    spec = {
        "kind": "line",
        "title": "Housing",
        "data": {"tool": "query_data", "args": TENURE},
        "x": "year",
        "y": "value",
    }
    result = tool.function(**spec)
    assert "share the same year" in result["error"]
    assert "variable" in result["error"]
    # Splitting by the varying column makes every point unique.
    split = tool.function(**{**spec, "kind": "area", "series": "variable"})
    assert isinstance(split, ToolReturn)


def test_overlap_check_ignores_tables_and_unique_points():
    rows = [{"year": 2022, "v": 1, "name": "A"}, {"year": 2022, "v": 2, "name": "B"}]
    ref = {"tool": "query_data", "args": TENURE}
    line = ChartSpec(kind="line", title="t", data=ref, x="year", y="v")
    assert overlapping_rows(line, rows) == ["name"]
    by_name = ChartSpec(
        kind="line", title="t", data=ref, x="year", y="v", series="name"
    )
    assert overlapping_rows(by_name, rows) is None
    table = ChartSpec(kind="table", title="t", data=ref)
    assert overlapping_rows(table, rows) is None


def test_chart_kinds_require_their_encodings():
    ref = {"tool": "query_data", "args": TENURE}
    with pytest.raises(ValidationError, match="needs x and y"):
        ChartSpec(kind="bar", title="t", data=ref, x="year")
    with pytest.raises(ValidationError, match="needs a series"):
        ChartSpec(kind="stacked_bar", title="t", data=ref, x="year", y="value")
    assert ChartSpec(kind="table", title="t", data=ref, columns=["year"]).x is None


def test_zoning_summary_can_back_a_chart(service):
    tool = chart_tool(service, ChatSettings())
    result = tool.function(
        kind="bar",
        title="Zoning acres by district type",
        data={"tool": "get_zoning_summary", "args": {"municipality": "Addison"}},
        x="district_type",
        y="recorded_acres",
    )
    assert isinstance(result, ToolReturn)
    assert result.return_value["row_count"] == 2


def test_single_filter_values_are_wrapped_in_lists(service):
    ref = DataRef(
        tool="query_data",
        args={"dataset_id": INCOME, "filters": {"name": "Addison County, Vermont"}},
    )
    assert ref.args["filters"] == {"name": ["Addison County, Vermont"]}
    assert len(resolve_rows(service, ref, 100)["rows"]) == 3


def test_ref_args_schema_lists_fields_for_models():
    # A bare dict schema reaches some models as an object with no fields, and
    # they then always send {} (seen with GPT-6.1 Sol through OpenRouter).
    args = DataRef.model_json_schema()["properties"]["args"]
    assert "dataset_id" in args["properties"]
    assert "filters" in args["properties"]
    nulls = DataRef(tool="get_timeseries", args={"dataset_id": INCOME, "years": None})
    assert nulls.args == {"dataset_id": INCOME}


@pytest.mark.parametrize(
    ("status", "phrase"),
    [
        (402, "usage limit"),
        (429, "busy"),
        (401, "isn't configured"),
        (400, "couldn't handle"),
        (503, "unavailable"),
    ],
)
def test_provider_http_errors_end_the_turn_with_a_specific_message(
    warehouse, status, phrase
):
    async def fails(_messages, _info):
        raise ModelHTTPError(status_code=status, model_name="some/model")
        yield ""  # an async generator, like a streaming model

    settings = ChatSettings(model="demo", warehouse_path=warehouse)
    agent = build_agent(settings, DataToolService(warehouse))

    async def run():
        with agent.override(model=FunctionModel(stream_function=fails)):
            return [e async for e in stream_answer(agent, settings, "hi", [])]

    events = asyncio.run(run())
    assert events[-1]["type"] == "error"
    assert phrase in events[-1]["message"]


def test_openrouter_models_report_cost_and_skip_data_collecting_providers(warehouse):
    settings = ChatSettings(
        model="anthropic/claude-haiku-5.5", warehouse_path=warehouse
    )
    agent = build_agent(settings, DataToolService(warehouse))
    assert agent.model_settings["openrouter_provider"] == {"data_collection": "deny"}
    assert agent.model_settings["openrouter_usage"] == {"include": True}


def openrouter_requests(warehouse, slug):
    """Play one tool-using turn against a fake OpenRouter; return the request
    bodies it received and the turn's events."""
    bodies = []

    def respond(request):
        body = json.loads(request.content)
        bodies.append(body)
        delta = (
            {
                "role": "assistant",
                "tool_calls": [
                    {
                        "index": 0,
                        "id": "call_1",
                        "type": "function",
                        "function": {"name": "list_datasets", "arguments": "{}"},
                    }
                ],
            }
            if len(bodies) == 1
            else {"role": "assistant", "content": "Done."}
        )
        chunk = {
            "id": "x",
            "object": "chat.completion.chunk",
            "created": 1,
            "model": body["model"],
            "choices": [
                {
                    "index": 0,
                    "delta": delta,
                    "finish_reason": "tool_calls" if len(bodies) == 1 else "stop",
                }
            ],
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 1,
                "total_tokens": 11,
                "prompt_tokens_details": {"cached_tokens": 7, "cache_write_tokens": 2},
            },
        }
        return httpx2.Response(
            200,
            content=f"data: {json.dumps(chunk)}\n\ndata: [DONE]\n\n",
            headers={"content-type": "text/event-stream"},
        )

    settings = ChatSettings(model=slug, warehouse_path=warehouse)
    agent = build_agent(settings, DataToolService(warehouse))

    async def run():
        client = httpx2.AsyncClient(transport=httpx2.MockTransport(respond))
        model = OpenRouterModel(
            slug, provider=OpenRouterProvider(api_key="test", http_client=client)
        )
        with agent.override(model=model):
            return [e async for e in stream_answer(agent, settings, "hi", [])]

    return bodies, asyncio.run(run())


def cache_marked(part) -> bool:
    return "cache_control" in json.dumps(part)


def test_claude_requests_mark_the_repeated_prefix_as_cacheable(warehouse):
    bodies, events = openrouter_requests(warehouse, "anthropic/claude-haiku-5.5")
    assert len(bodies) == 2
    for body in bodies:
        # The last tool definition, the instructions, and the newest message:
        # everything before each marker is read from cache on the next request.
        assert [cache_marked(tool) for tool in body["tools"]][-1]
        assert cache_marked(body["messages"][0])
        assert cache_marked(body["messages"][-1])
    assert bodies[1]["messages"][-1]["role"] == "tool"
    usage = events[-1]["usage"]
    assert usage["cache_read_tokens"] == 14
    assert usage["cache_write_tokens"] == 4


def test_other_models_get_no_cache_markers(warehouse):
    bodies, events = openrouter_requests(warehouse, "openai/gpt-6.1-sol")
    assert events[-1]["type"] == "done"
    assert not any(cache_marked(body) for body in bodies)
