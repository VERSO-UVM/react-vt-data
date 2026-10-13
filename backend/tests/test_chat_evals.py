"""Eval suite tests: offline, with the scripted demo model and a scripted judge."""

import asyncio
import json
import os

import duckdb
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic_ai import Agent, ModelResponse, PromptedOutput, TextPart
from pydantic_ai.models.function import FunctionModel

from chat.evals_router import create_evals_router
from data_tools.service import DataToolService
from evals.chat.__main__ import load_dotenv, split_models
from evals.chat.cases import Case, load_cases
from evals.chat.judge import GENERAL_CRITERIA, Verdict
from evals.chat.runner import automatic_checks, run_eval, save_run


@pytest.fixture
def service(tmp_path):
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
            "INSERT INTO acs5Economics_medianHouseholdIncome_timeseries VALUES ('2021', 'Addison County, Vermont', 61000, 'county'), ('2022', 'Addison County, Vermont', 64000, 'county'), ('2021', 'Chittenden County, Vermont', 71000, 'county')"
        )
    return DataToolService(path)


CASE = Case(
    id="income",
    title="Income trend",
    capability="trend",
    turns=["How has income changed?", "And Chittenden?"],
    criteria=["Gives the latest value.", "Names the source."],
    expect_chart=["line"],
    reference=[
        {
            "label": "Income",
            "tool": "get_timeseries",
            "args": {"dataset_id": "acs5_ts_household_income"},
        }
    ],
)


def scripted_judge(passes: list[bool], seen: list[str]) -> Agent:
    """A judge that records its prompt and returns a fixed verdict."""

    def respond(messages, _info):
        seen.append(messages[-1].parts[-1].content)
        verdict = {
            "criteria": [
                {"criterion": i, "passed": p, "reason": f"reason {i}"}
                for i, p in enumerate(passes, 1)
            ],
            "quality": 7,
            "summary": "Fine.",
        }
        return ModelResponse(parts=[TextPart(json.dumps(verdict))])

    return Agent(FunctionModel(respond), output_type=PromptedOutput(Verdict))


def test_repo_cases_load_and_reference_valid_queries():
    cases = load_cases()
    assert len(cases) >= 5
    assert all(c.reference and c.criteria for c in cases)
    with pytest.raises(ValueError, match="Unknown case ids"):
        load_cases(only=["no-such-case"])


def test_run_plays_every_turn_checks_judges_and_scores(service, tmp_path):
    prompts: list[str] = []
    criteria_count = len(CASE.criteria) + len(GENERAL_CRITERIA)
    passes = [True] * (criteria_count - 1) + [False]
    run = asyncio.run(
        run_eval(
            ["demo"],
            [CASE],
            judge_model="scripted",
            service=service,
            judge=scripted_judge(passes, prompts),
        )
    )
    (result,) = run["results"]
    assert [t["question"] for t in result["turns"]] == CASE.turns
    assert result["turns"][0]["charts"][0]["kind"] == "line"
    assert result["turns"][0]["charts"][0]["row_count"] == 3
    assert all(c["passed"] for c in result["checks"])
    assert result["judge"]["criteria"][-1] == {
        "text": GENERAL_CRITERIA[-1],
        "passed": False,
        "reason": f"reason {criteria_count}",
    }
    total = len(result["checks"]) + criteria_count
    assert result["score"] == round((total - 1) / total, 3)
    # The judge sees both turns, the chart rows, and the reference data.
    assert "And Chittenden?" in prompts[0]
    assert "Reference data" in prompts[0] and "61000" in prompts[0]
    assert run["summary"][0]["quality"] == 7
    assert save_run(run, tmp_path).exists()


def test_failed_judge_keeps_the_chat_without_a_score(service):
    def broken(_messages, _info):
        return ModelResponse(parts=[TextPart("not json")])

    judge = Agent(FunctionModel(broken), output_type=PromptedOutput(Verdict), retries=0)
    run = asyncio.run(
        run_eval(["demo"], [CASE], judge_model="x", service=service, judge=judge)
    )
    (result,) = run["results"]
    assert result["score"] is None
    assert result["judge"]["error"]
    assert result["turns"][0]["answer"]


def test_automatic_checks_flag_missing_charts_errors_and_long_answers():
    turn = {"answer": "word " * 300, "charts": [{"kind": "bar"}], "error": None}
    checks = {c["name"]: c["passed"] for c in automatic_checks(CASE, [turn])}
    assert checks == {
        "Finishes without an error": True,
        "Answers stay under 250 words": False,
        "Shows a line chart": False,
    }
    failed = {**turn, "answer": "", "error": "Stopped."}
    assert not automatic_checks(CASE, [failed])[0]["passed"]


def test_evals_router_lists_runs_and_rejects_bad_ids(tmp_path):
    save_run(
        {"run_id": "20260101-000000", "models": ["a"], "cases": [], "summary": []},
        tmp_path,
    )
    app = FastAPI()
    app.include_router(create_evals_router(tmp_path), prefix="/api")
    client = TestClient(app)
    runs = client.get("/api/chat/evals")
    assert runs.headers["cache-control"] == "no-store"
    assert [r["run_id"] for r in runs.json()] == ["20260101-000000"]
    assert client.get("/api/chat/evals/20260101-000000").json()["models"] == ["a"]
    assert client.get("/api/chat/evals/..%2Fsecret").status_code == 404
    assert client.get("/api/chat/evals/missing").status_code == 404


def test_cli_helpers(tmp_path, monkeypatch):
    assert split_models(["a/b,c/d", "e/f"]) == ["a/b", "c/d", "e/f"]
    env = tmp_path / ".env"
    env.write_text("# comment\nEVAL_TEST_KEY='from-file'\nEVAL_TEST_SET=from-file\n")
    monkeypatch.setenv("EVAL_TEST_SET", "from-shell")
    monkeypatch.delenv("EVAL_TEST_KEY", raising=False)
    load_dotenv(env)
    assert os.environ["EVAL_TEST_KEY"] == "from-file"
    assert os.environ["EVAL_TEST_SET"] == "from-shell"
