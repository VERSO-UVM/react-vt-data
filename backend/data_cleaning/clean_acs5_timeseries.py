"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-16
**Description**:
    Cleaning for the ACS-5 timeseries tables derived from the raw
    `demographics`, `economic`, `housing`, `acs5_economic` and `acs5_housing`
    DuckLake tables:

    Cleaning Steps:
    1. Numeric -6666666 (UNAVALILABLE) turned into NA,
    2. Column "county_subdivision" renamed to "town"
    3. Columns "geoid" and "county_fips" are merged in.

**Run ALL datasets**:
python run_data_cleaning.py clean_acs5_timeseries

**Run only a SUBSET** (from Python):
main(con, ["median_age", "vacancy_rate"])
"""

import sys
from dataclasses import dataclass

import duckdb

from data_cleaning.geo_lookup import (
    UNAVAILABLE,
    acs_geo_sql,
    build_geo_lookups,
    write_table,
)

# Raw identifier columns every base query must expose (see `acs_geo_sql`)
KEYS = "year, NAME, geo_type, state, county"

# For filtering the housing cost burden table
MORTGAGE_SUBCATEGORY = (
    "Housing units with a mortgage (excluding units where SMOCAPI cannot be computed)"
)


# A TimeSeries data class for
@dataclass(frozen=True)
class TimeSeries:
    """
    A cleaned time series table to be written to the
    lake.CLEANED DuckLake schema.

    Attributes:
        table: The final lake.CLEANED table name.
        base: Raw SELECT: KEYS plus the measure columns below.
        columns: Measure columns, in output order
        with_county: Include the "county" name column
    """

    table: str
    base: str
    columns: tuple[str, ...]
    with_county: bool = True


def numeric(expr: str) -> str:
    """
    Casting numeric values
    NULL when non-numeric or a census unavailable value.

    Args:
        expr: Column name to cast to numeric. (Typically the "Value" column)

    Returns:
        str: A string sql query line
    """
    return f"NULLIF(TRY_CAST({expr} AS DOUBLE), {UNAVAILABLE})"


def in_list(values: list[str]) -> str:
    """
    Condenses a list of strings into a comma (,) seperated list for SQL syntax.

    Args:
        values: A list of strings. Typically a list of column names

    Returns
        str: A string format of each list item, separated by a comma (,)
    """
    return ", ".join(f"'{v}'" for v in values)


def single_variable(
    source: str,
    variables: list[str],
    out_col: str,
    value_col: str = "Value",
    keep_variable: bool = False,
) -> str:
    """
    Filters a RAW lake table to Key, variable (if true), and value columns

    Args:
        source: RAW table schema name from which the time series variable comes from.
        variables: List of variable names to filter dataset to.
        out_col:
        value_col: Column name containing the tracked value over time.
        keep_variable: (T/F) if you want to keep the variable column. Best for timeseries tables tracking multiple variables.

    Returns:
        str: A SQL query which filters the source table to contain the time series variable(s)


    """
    variable = ", Variable" if keep_variable else ""
    return f"""--sql
        SELECT {KEYS}{variable}, {numeric(value_col)} AS {out_col}
        FROM lake.RAW.{source}
        WHERE Variable IN ({in_list(variables)})
        """


def population_change_sql() -> str:
    """
    Year-to-year percentage (%) change in `Population (ACS)` (first year is dropped).

    Returns:
        str: A SQL query that creates the population change table
    """
    return f"""--sql
        SELECT {KEYS}, Population, Pct_Population_Change
        FROM (
            SELECT
                {KEYS},
                Population,
                ROUND(
                    (
                        Population
                        / NULLIF(
                            LAG(Population) OVER (
                                PARTITION BY NAME, geo_type ORDER BY year
                            ),
                            0
                        )
                        - 1
                    ) * 100,
                    1
                ) AS Pct_Population_Change
            FROM (
                SELECT {KEYS}, {numeric("Value")} AS Population
                FROM lake.RAW.demographics
                WHERE Variable = 'Population (ACS)'
            )
        )
        WHERE Pct_Population_Change IS NOT NULL
        """


def age_dependency_ratio_sql() -> str:
    """
    SQL calculating age dependency ratio: (`Under 18` + `65 and over`) / (`18 to 64`) * 100.

    Returns:
        str: A SQL query that creates the age dependency ratio table
    """
    ages = [
        "Under 18",
        "18 to 24",
        "25 to 34",
        "35 to 44",
        "45 to 54",
        "55 to 64",
        "65 to 74",
        "75 Plus",
    ]
    wide = ",\n".join(
        f"MAX(CASE WHEN Variable = '{a}' THEN v END) AS \"{a}\"" for a in ages
    )
    working = " + ".join(f'"{a}"' for a in ages[1:6])

    return f"""--sql
        SELECT
            {KEYS},
            ROUND(
                CASE
                    WHEN ({working}) > 0
                        THEN ("Under 18" + "65 to 74" + "75 Plus")
                            / ({working}) * 100
                END,
                1
            ) AS age_dependency_ratio
        FROM (
            SELECT {KEYS}, {wide}
            FROM (
                SELECT {KEYS}, Variable, {numeric("Value")} AS v
                FROM lake.RAW.demographics
                WHERE Variable IN ({in_list(ages)})
            )
            GROUP BY {KEYS}
        )
        """


# Define a dictionary of defined TimeSeries objects
CONFIGS: dict[str, TimeSeries] = {
    # Median age
    "median_age": TimeSeries(
        table="acs5Demographics_medianAge_timeseries",
        base=single_variable("demographics", ["Median Age"], "median_age"),
        columns=("median_age",),
    ),
    # Median Household Income
    "median_hh_income": TimeSeries(
        table="acs5Economics_medianHouseholdIncome_timeseries",
        base=single_variable(
            "economic", ["Median Household Income"], "median_household_income"
        ),
        columns=("median_household_income",),
    ),
    # Median Home Value
    "median_home_value": TimeSeries(
        table="acs5Housing_medianHomeValue_timeseries",
        base=single_variable("housing", ["Median Home Value"], "median_home_value"),
        columns=("median_home_value",),
    ),
    # Per Capita Income
    "per_capita_income": TimeSeries(
        table="acs5Economics_perCapitaIncome_timeseries",
        base=single_variable("economic", ["Per Capita Income"], "per_capita_income"),
        columns=("per_capita_income",),
    ),
    # Total Housing Units
    "total_housing_units": TimeSeries(
        table="acs5Housing_housingUnits_timeseries",
        base=single_variable("housing", ["Total Housing Units"], "total_housing_units"),
        columns=("total_housing_units",),
    ),
    # Vacancy Rates
    "vacancy_rate": TimeSeries(
        table="acs5Housing_vacancyRates_timeseries",
        base=single_variable(
            "housing",
            ["Homeowner Vacancy Rate", "Rental Vacancy Rate"],
            "percent",
            value_col="Percent",
            keep_variable=True,
        ),
        columns=("Variable", "percent"),
    ),
    # Population Change (%)
    "population_change": TimeSeries(
        table="acs5Demographics_populationChange_timeseries",
        base=population_change_sql(),
        columns=("Population", "Pct_Population_Change"),
    ),
    # Age Dependency Ratio
    "age_dependency_ratio": TimeSeries(
        table="acs5Demographics_ageDependencyRatio_timeseries",
        base=age_dependency_ratio_sql(),
        columns=("age_dependency_ratio",),
    ),
    # Health Insurance Coverage (Public, Private, None)
    "health_insurance": TimeSeries(
        table="acs5Economics_healthInsurance_timeseries",
        base=f"""--sql
            SELECT {KEYS}, Variable, {numeric("Value")} AS "Value"
            FROM lake.RAW.acs5_economic
            WHERE Category LIKE '%INSURANCE%'
                AND Subcategory = 'Civilian noninstitutionalized population'
                AND Variable IN (
                    'With health insurance coverage: With public coverage',
                    'With health insurance coverage: With private health insurance',
                    'No health insurance coverage'
                )
                AND Measure = 'Estimate'
            """,
        columns=("Variable", "Value"),
        with_county=False,
    ),
    # Median Earnings (Male, Female, All Workers)
    "median_earnings": TimeSeries(
        table="acs5Economics_medianEarnings_timeseries",
        base=f"""--sql
            SELECT {KEYS}, Subcategory AS Variable, {numeric("Value")} AS "Value"
            FROM lake.RAW.acs5_economic
            WHERE Category LIKE '%INCOME AND BENEFITS%'
                AND Subcategory IN (
                    'Median earnings for male full-time, year-round workers (dollars)',
                    'Median earnings for female full-time, year-round workers (dollars)',
                    'Median earnings for workers (dollars)'
                )
                AND Variable = 'Total'
                AND Measure = 'Estimate'
            """,
        columns=("Variable", "Value"),
        with_county=False,
    ),
    # Housing Cost Burden (>30% of income on housing)
    "housing_cost_burden": TimeSeries(
        table="acs5Housing_incomeBurden_timeseries",
        base=f"""--sql
            SELECT
                {KEYS},
                NULLIF(SUM(TRY_CAST(Value AS DOUBLE)), {UNAVAILABLE})
                    AS pct_housing_burden
            FROM lake.RAW.acs5_housing
            WHERE Category LIKE
                    '%SELECTED MONTHLY OWNER COSTS AS A PERCENTAGE OF HOUSEHOLD INCOME%'
                AND Subcategory = '{MORTGAGE_SUBCATEGORY}'
                AND Variable IN ('30.0 to 34.9 percent', '35.0 percent or more')
                AND Measure = 'Percent'
            GROUP BY {KEYS}
            """,
        columns=("pct_housing_burden",),
        with_county=False,
    ),
}


def final_sql(cfg: TimeSeries) -> str:
    """
    Final table schema selection for TimeSeries datasets using the
    :func:`geo_lookup.acs_geo_sql`

    Args:
        cfg: A TimeSeries dataclass object

    Returns:
        str: A SQL query selecting the final table schema including the 'geo_type' column.

    """
    county = ["county"] if cfg.with_county else []
    columns = ["year", "name", "geoid", "county_fips", *county, *cfg.columns]
    select = ", ".join(f'{c} AS "{c}"' if c == "geoid" else c for c in columns)

    return f"""--sql
        SELECT {select}, geo_type
        FROM ({acs_geo_sql(cfg.base)})
        """


def main(con: duckdb.DuckDBPyConnection, names: list[str] | None = None) -> None:
    targets = names or list(CONFIGS)
    unknown = [n for n in targets if n not in CONFIGS]

    if unknown:
        sys.exit(
            f"Unknown dataset(s): {', '.join(unknown)}. Choices: {', '.join(CONFIGS)}"
        )

    build_geo_lookups(con)

    for name in targets:
        cfg = CONFIGS[name]
        write_table(con, cfg.table, final_sql(cfg))
