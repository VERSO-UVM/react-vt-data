"""
Indicators for the Statewide County Comparison page: one value per Vermont
county, plus Vermont and the United States, per year, for a single Census
Data Profile measure.

Census relabels Data Profile rows between vintages, so one indicator can sit
under several (subcategory, variable) label paths, e.g. the share of adults
with a bachelor's degree or higher is

    "Percent bachelor's degree or higher" / "Total"                  2010-2016
    "Population 25 years and over" / "Percent bachelor's degree..."  2017
    "Population 25 years and over" / "Bachelor's degree or higher"   2018-2024

and its percent is stored as measure "Percent Estimate" in 2017-2018 but
"Percent" otherwise. Each Indicator lists every path and measure it has
used, so the query stitches them into one series per place.

Some categories also change name every year, e.g. "INCOME AND BENEFITS (IN
2024 INFLATION-ADJUSTED DOLLARS)", so `category` is a SQL LIKE pattern.

Indicators not built yet are listed with available=False so the page can show
them as "coming soon".
"""

from dataclasses import dataclass
from pathlib import Path

from query.sql_render import _placeholder, filter_clauses, render_sql

SQL_PATH = (
    Path(__file__).resolve().parent / "sql" / "acs5" / "acs5_dp_county_comparison.sql"
)
SOURCE_TABLE = "acs5_dp_combined_tidy"

# Geographies the comparison shows: the 14 counties plus two benchmarks.
GEO_TYPES = ("county", "state", "national")
PERCENT_MEASURES = ("Percent", "Percent Estimate")

EDUCATION = "EDUCATIONAL ATTAINMENT"
ADULTS_25_PLUS = "Population 25 years and over"


@dataclass(frozen=True)
class Indicator:
    key: str
    label: str
    topic: str
    description: str = ""
    units: str = "percent"
    table: str = ""
    category: str = ""  # SQL LIKE pattern; a plain name matches exactly
    paths: tuple[tuple[str, str], ...] = ()  # (subcategory, variable)
    measures: tuple[str, ...] = PERCENT_MEASURES
    available: bool = True


def _education(key: str, label: str, *names: str) -> Indicator:
    """An educational attainment level, under every name Census has used.

    2010-2012 file each level as its own subcategory ("<name>" / "Total");
    from 2013 it is a variable under "Population 25 years and over".
    """
    return Indicator(
        key=key,
        label=label,
        topic="Educational attainment",
        description=f"{label}, as a percent of adults 25 years and over.",
        table="DP02",
        category=EDUCATION,
        paths=tuple((name, "Total") for name in names)
        + tuple((ADULTS_25_PLUS, name) for name in names),
    )


def _coming_soon(key: str, label: str) -> Indicator:
    return Indicator(key=key, label=label, topic=label, available=False)


INDICATORS = [
    _education(
        "edu_bachelors_or_higher",
        "Bachelor's degree or higher",
        "Percent bachelor's degree or higher",
        "Bachelor's degree or higher",
    ),
    _education(
        "edu_hs_or_higher",
        "High school graduate or higher",
        "Percent high school graduate or higher",
        "High school graduate or higher",
    ),
    _education("edu_less_than_9th", "Less than 9th grade", "Less than 9th grade"),
    _education(
        "edu_9th_to_12th",
        "9th to 12th grade, no diploma",
        "9th to 12th grade, no diploma",
    ),
    _education(
        "edu_hs_graduate",
        "High school graduate (includes equivalency)",
        "High school graduate (includes equivalency)",
    ),
    _education(
        "edu_some_college", "Some college, no degree", "Some college, no degree"
    ),
    _education("edu_associates", "Associate's degree", "Associate's degree"),
    _education("edu_bachelors", "Bachelor's degree", "Bachelor's degree"),
    _education(
        "edu_graduate",
        "Graduate or professional degree",
        "Graduate or professional degree",
    ),
    _coming_soon("disability", "Disability"),
    _coming_soon("unemployment", "Unemployment"),
    _coming_soon("poverty", "Poverty"),
    Indicator(
        key="median_household_income",
        label="Median household income",
        topic="Income",
        # Each year is in that year's dollars, as Census publishes it (the
        # same as the Census Variable Comparison); not adjusted across years.
        description=(
            "Median household income, in dollars of the survey year "
            "(not adjusted for inflation between years)."
        ),
        units="dollars",
        table="DP03",
        category="INCOME AND BENEFITS (IN % INFLATION-ADJUSTED DOLLARS)",
        paths=(
            ("Median household income (dollars)", "Total"),  # 2010-2012
            ("Total households", "Median household income (dollars)"),  # 2013+
        ),
        measures=("Estimate",),
    ),
    _coming_soon("population_density", "Population density"),
    _coming_soon("farm_acreage", "Farm acreage"),
]

INDICATORS_BY_KEY = {i.key: i for i in INDICATORS}


def indicator_options() -> list[dict]:
    """The picker list: every indicator, built or not, without its SQL paths."""
    return [
        {
            "key": i.key,
            "label": i.label,
            "topic": i.topic,
            "description": i.description,
            "units": i.units,
            "available": i.available,
        }
        for i in INDICATORS
    ]


def comparison_query(indicator: Indicator) -> tuple[str, list]:
    """Render the comparison query for one indicator; returns (sql, params).

    Rows are {place, geo_type, year, value}, where `place` is the short display
    name ("Essex", "Vermont", "United States"). Values travel as $N
    placeholders: execute with `DB.execute(sql, params)`.
    """
    params: list = []
    clauses = filter_clauses(
        {
            "table": [indicator.table],
            "measure": list(indicator.measures),
            "geo_type": list(GEO_TYPES),
        },
        params,
    )
    clauses.append(f"category LIKE {_placeholder(indicator.category, params)}")
    paths = " OR ".join(
        f"(subcategory = {_placeholder(sub, params)}"
        f" AND variable = {_placeholder(var, params)})"
        for sub, var in indicator.paths
    )
    clauses.append(f"({paths})")
    clauses.append("value IS NOT NULL")
    where_string = "WHERE " + "\n    AND ".join(clauses)
    return render_sql(SQL_PATH, table=SOURCE_TABLE, where_string=where_string), params
