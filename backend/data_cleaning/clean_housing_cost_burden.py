"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-14
**Description**:
    Data cleaning script for housing cost burden by tenure.

    A household is cost-burdened when it spends 30% or more of household
    income on housing. Burden is reported separately for each tenure
    because the Census measures renters and owners differently:

    DP04 -> GROSS RENT AS A PERCENTAGE OF HOUSEHOLD INCOME (GRAPI)
        - Renters
    DP04 -> SELECTED MONTHLY OWNER COSTS AS A PERCENTAGE OF HOUSEHOLD INCOME (SMOCAPI)
        - Owners with a mortgage
        - Owners without a mortgage

    For each tenure, the household counts (`Measure = 'Estimate'`) in the
    30.0-34.9% and 35.0%+ brackets are summed and divided by the tenure's
    `Total` (households where the percentage can be computed). Counts are
    used instead of the published percentages because their labels are
    stable across years (the percentages are `Percent Estimate` in
    2017-2018) and because they can be summed into an `All households` row.

    Census sentinels (negative values) and non-numeric values are treated
    as missing before any arithmetic. A tenure's row is missing unless both
    brackets and the total are present exactly once; `All households` is
    missing unless all three tenures are complete. `Percent` is null when
    the universe is zero (no households of that tenure).

    Coverage starts in 2013. Earlier years use a different DP04 layout, and
    2010-2012 do not distinguish owners with and without a mortgage.

    Output (long format), one row per year, place, and tenure:
        year, NAME, geo_type, Variable, Value, Total, Percent
    where Value is cost-burdened households, Total is the universe, and
    Percent is Value / Total rounded to one decimal.

    Derived from the `RAW.acs5_housing` DuckLake table.

**Run with**:
    python -m data_cleaning.clean_housing_cost_burden
"""

import duckdb
import pandas as pd

FIRST_YEAR = 2013

TENURES = {
    "Occupied units paying rent (excluding units where GRAPI cannot be computed)": (
        "Renters"
    ),
    "Housing units with a mortgage (excluding units where SMOCAPI cannot be computed)": (
        "Owners with a mortgage"
    ),
    "Housing unit without a mortgage (excluding units where SMOCAPI cannot be computed)": (
        "Owners without a mortgage"
    ),
}

ALL_HOUSEHOLDS = "All households"

BURDEN_BRACKETS = ["30.0 to 34.9 percent", "35.0 percent or more"]


def build_burden(
    con: duckdb.DuckDBPyConnection,
    source: str = "lake.RAW.acs5_housing",
) -> pd.DataFrame:
    """
    Compute cost-burdened household counts and rates by tenure, plus an
    all-households row, from the raw DP04 table `source`.
    """
    tenure_cases = "\n".join(f"WHEN ? THEN '{label}'" for label in TENURES.values())

    return con.execute(
        f"""--sql
        WITH src AS (
            SELECT
                year,
                NAME,
                geo_type,
                CASE Subcategory {tenure_cases} END AS tenure,
                Variable,
                -- Census sentinels are large negative numbers; '(X)' and
                -- other text fail the cast. Both become NULL.
                CASE
                    WHEN TRY_CAST(Value AS DOUBLE) >= 0
                        THEN TRY_CAST(Value AS DOUBLE)
                END AS v
            FROM {source}
            WHERE year >= ?
                AND Measure = 'Estimate'
                AND Subcategory IN (?, ?, ?)
                AND Variable IN (?, ?, 'Total')
        ),

        by_tenure AS (
            SELECT
                year,
                NAME,
                geo_type,
                tenure,
                SUM(v) FILTER (WHERE Variable <> 'Total') AS burdened,
                COUNT(v) FILTER (WHERE Variable <> 'Total') AS n_brackets,
                COUNT(*) FILTER (WHERE Variable <> 'Total') AS n_bracket_rows,
                MAX(v) FILTER (WHERE Variable = 'Total') AS total,
                COUNT(v) FILTER (WHERE Variable = 'Total') AS n_totals,
                COUNT(*) FILTER (WHERE Variable = 'Total') AS n_total_rows
            FROM src
            GROUP BY year, NAME, geo_type, tenure
        ),

        tenure_rows AS (
            SELECT
                year,
                NAME,
                geo_type,
                tenure AS Variable,
                CASE
                    WHEN n_brackets = 2 AND n_bracket_rows = 2 THEN burdened
                END AS Value,
                CASE WHEN n_totals = 1 AND n_total_rows = 1 THEN total END AS Total
            FROM by_tenure
        ),

        all_rows AS (
            SELECT
                year,
                NAME,
                geo_type,
                '{ALL_HOUSEHOLDS}' AS Variable,
                CASE WHEN COUNT(Value) = 3 THEN SUM(Value) END AS Value,
                CASE WHEN COUNT(Total) = 3 THEN SUM(Total) END AS Total
            FROM tenure_rows
            GROUP BY year, NAME, geo_type
        ),

        combined AS (
            SELECT * FROM tenure_rows
            UNION ALL
            SELECT * FROM all_rows
        )

        SELECT
            year,
            NAME,
            geo_type,
            Variable,
            Value,
            Total,
            CASE
                WHEN Value IS NOT NULL AND Total > 0
                    THEN ROUND(100 * Value / Total, 1)
            END AS Percent
        FROM combined
        ORDER BY year, geo_type, NAME, Variable
        """,
        [
            *TENURES.keys(),
            FIRST_YEAR,
            *TENURES.keys(),
            *BURDEN_BRACKETS,
        ],
    ).df()


def clean(con: duckdb.DuckDBPyConnection) -> pd.DataFrame:
    return build_burden(con)


def add_to_lake(con: duckdb.DuckDBPyConnection, clean_df: pd.DataFrame):
    """
    Writes the cleaned, long-format housing cost burden dataframe
    to the CLEANED schema in DuckLake.
    """
    con.execute(
        """--sql
        CREATE OR REPLACE TABLE lake.CLEANED.acs5Housing_incomeBurden_timeseries AS
        SELECT * FROM clean_df
        """
    )


def main(con: duckdb.DuckDBPyConnection):
    clean_df = clean(con)
    add_to_lake(con, clean_df)


if __name__ == "__main__":
    from lake_build import get_connection

    connection = get_connection()
    try:
        main(connection)
    finally:
        connection.close()
