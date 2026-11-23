"""Load and validate the eval cases in cases.toml."""

from __future__ import annotations

import tomllib
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from chat.charts import DataRef, resolve_rows
from data_tools.models import TOOL_MODELS
from data_tools.service import DataToolService

CASES_PATH = Path(__file__).with_name("cases.toml")
# Rows of each reference shown to the judge; enough to check any number an
# answer is likely to cite without flooding the judge's context.
REFERENCE_ROWS = 60
# Columns that are plumbing, not facts the judge needs.
REFERENCE_HIDDEN = {"_location_id", "_units", "_unit_issue", "county_fips"}


class Reference(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str
    tool: str
    args: dict[str, Any] = Field(default_factory=dict)
    sort_by: str | None = None
    descending: bool = True
    top: int | None = Field(default=None, ge=1, le=100)

    @model_validator(mode="after")
    def valid_query(self):
        if self.tool not in TOOL_MODELS or self.tool == "export_data":
            raise ValueError(f"Unknown reference tool {self.tool!r}")
        if self.sort_by:
            self.data_ref()  # ranking needs a chartable tool
        else:
            TOOL_MODELS[self.tool].model_validate(self.args)
        return self

    def data_ref(self) -> DataRef:
        return DataRef(
            tool=self.tool,
            args=self.args,
            sort_by=self.sort_by,
            descending=self.descending,
            top=self.top,
        )

    def run(self, service: DataToolService) -> dict[str, Any]:
        """Query the warehouse; return the rows the judge sees."""
        if self.sort_by or self.tool in ("get_timeseries", "query_data"):
            result = resolve_rows(service, self.data_ref(), 5000)
        else:
            result = service.call(self.tool, self.args)
        rows = result.get("rows", [])
        return {
            "label": self.label,
            "units": result.get("units"),
            "row_count": len(rows),
            "rows": [
                {k: v for k, v in row.items() if k not in REFERENCE_HIDDEN}
                for row in rows[:REFERENCE_ROWS]
            ],
        }


class Case(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(pattern=r"^[a-z0-9-]+$")
    title: str
    capability: str
    turns: list[str] = Field(min_length=1)
    criteria: list[str] = Field(min_length=1)
    expect_chart: list[str] = Field(default_factory=list)
    max_words: int = 250
    reference: list[Reference] = Field(default_factory=list)


def load_cases(path: Path = CASES_PATH, only: list[str] | None = None) -> list[Case]:
    raw = tomllib.loads(path.read_text())
    cases = [Case.model_validate(c) for c in raw.get("case", [])]
    ids = [c.id for c in cases]
    if len(set(ids)) != len(ids):
        raise ValueError("Case ids must be unique")
    if only:
        unknown = set(only) - set(ids)
        if unknown:
            raise ValueError(f"Unknown case ids: {', '.join(sorted(unknown))}")
        cases = [c for c in cases if c.id in only]
    return cases
