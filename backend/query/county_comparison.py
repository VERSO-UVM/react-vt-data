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

Indicators not built yet are listed with available=False so the page can show
them as "coming soon".
"""

from dataclasses import dataclass

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
    category: str = ""
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
    _coming_soon("median_household_income", "Median household income"),
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
    """SQL and params for one row per place per year.

    `place` is the short display name ("Essex", "Vermont", "United States").
    Should two stitched paths ever overlap in a year, the row with measure
    "Percent" wins so each place still gets a single bar.
    """
    path_sql = " OR ".join(
        "(subcategory = ? AND variable = ?)" for _ in indicator.paths
    )
    params: list = [indicator.table, indicator.category]
    params += [label for path in indicator.paths for label in path]
    params += list(indicator.measures)
    params += list(GEO_TYPES)
    sql = f"""--sql
        SELECT regexp_replace(name, ' County, Vermont$', '') AS place,
               geo_type,
               CAST(year AS INTEGER) AS year,
               CAST(value AS DOUBLE) AS value
        FROM acs5_dp_combined_tidy
        WHERE "table" = ?
          AND category = ?
          AND ({path_sql})
          AND measure IN ({", ".join("?" for _ in indicator.measures)})
          AND geo_type IN ({", ".join("?" for _ in GEO_TYPES)})
          AND value IS NOT NULL
        QUALIFY row_number() OVER (
            PARTITION BY name, year ORDER BY measure = 'Percent' DESC
        ) = 1
        ORDER BY year, place
    """
    return sql, params
