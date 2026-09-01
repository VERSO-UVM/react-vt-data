"""
**Author**:
    Ian Sargent
**Created**:
    2026-07-14
**Description**:
    Data cleaning script for the raw `zoning` table in the DuckLake
**Run with**:
python -m data_cleaning.clean_zoning
"""

from pathlib import Path

import pandas as pd

from app_utils.sql_render import render_sql
from lake_build import con

SQL_PATH = Path(__file__).resolve().parent / "sql"
# Town and zoning-district boundaries were digitised separately, so subtracting
# one from the other leaves hairline slivers along nearly every town edge.
# Dropping gap polygons below this size removes ~91% of the pieces while keeping
# >99.7% of the genuinely unzoned acreage.
MIN_GAP_ACRES = 10


# hardcoded specifics:
info_cols = [
    # identity
    "OBJECT_ID", "County", "RPC", "Municipal_Name", "GEO_ID",
    "District_Name", "Abbreviated_District_Name",
    # categorization
    "District_Type", "Elderly_Housing_District",
    # summary
    "Bylaw_Date", "District_Mapped", "Overlay_District",
    "Base_Density", "Affordable_Housing_District", "Notes",
]  # fmt: skip

geom_cols = ["OBJECT_ID", "geometry"]

use_types_remapper = {
    "F1F": "1_Family",
    "F2F": "2_Family",
    "F3F": "3_Family",
    "F4F": "4_Family",
    "ADU": "Accessory_Dwelling_Unit",
    "PRD": "Planned_Residential_Development",
    "PUD": "Planned_Unit_Development",
    "Affordable_Housing": "Affordable_Housing",
}

boolean_remapper = {
    "No": False,
    "Prohibited": False,
    "F": False,
    "Yes": True,
    "Permitted": True,
    "T": True,
}


## LOAD SPATIAL EXTENSION FUNCTION --------------------
def _load_spatial() -> None:
    """
    Load the spatial extension, installing it first if necessary.
    """
    try:
        con.execute("INSTALL spatial;")
    except Exception as e:
        print(f"Spatial install note: {e}")

    try:
        con.execute("LOAD spatial;")
    except Exception as e:
        print(f"CRITICAL: Failed to load spatial extension: {e}")
        raise e


def read_raw_data() -> pd.DataFrame:
    raw_df = con.execute(
        """--sql
        SELECT * 
        FROM lake.RAW.zoning
        """
    ).df()

    con.register("zoning_raw", raw_df)

    return raw_df


def build_info():
    info_string = ", ".join(info_cols)

    info_sql = render_sql(
        SQL_PATH / "zoning_info.sql",
        info_string=info_string,
    )

    # 1. Execute DDL to create the view
    con.execute(info_sql)

    # 2. Execute SELECT query ONCE and convert to DataFrame
    info_df = con.execute("SELECT * FROM raw_info").df()

    str_cols = info_df.select_dtypes("object").columns
    info_df[str_cols] = info_df[str_cols].apply(lambda c: c.str.strip())
    con.register("info", info_df)


def build_geom():
    con.execute(
        """--sql
        CREATE OR REPLACE TEMP VIEW geom AS
        SELECT
            OBJECT_ID,
            ST_GeomFromWKB(geometry) AS geometry
        FROM lake.RAW.zoning
        """
    )


def get_rule_cols():
    dropped_cols = ["Shape_Area", "Shape_Length"]
    all_cols = (
        con.execute(
            """--sql
        DESCRIBE lake.RAW.zoning
        """
        )
        .df()["column_name"]
        .tolist()
    )
    rule_cols = set(all_cols)
    for item in geom_cols + info_cols + ["Acres"] + dropped_cols:
        if item in rule_cols:
            rule_cols.remove(item)
    rule_cols = list(rule_cols)
    return rule_cols


def split_col(col: str, use_types: set[str]):
    for use_type in use_types:
        if col.startswith(f"{use_type}_"):
            rule = col[len(use_type) + 1 :]
            rule = rule.replace("/", "_")
            return use_type, rule
    return None, None


def build_rules(raw_df: pd.DataFrame):
    rule_cols = get_rule_cols()
    clean_rule_cols = [col.replace("/", "_") for col in rule_cols]

    cast_df = raw_df[["OBJECT_ID"] + rule_cols].copy()
    cast_df = cast_df.rename(columns=dict(zip(rule_cols, clean_rule_cols, strict=True)))
    # "string" (not str/object) preserves nulls as <NA> instead of the
    # literal text "nan" that .astype(str) would produce
    cast_df[clean_rule_cols] = cast_df[clean_rule_cols].astype("string")

    con.register("zoning_raw", cast_df)  # temporary swap
    try:
        rule_string = ", ".join(clean_rule_cols)

        # 1. Execute DDL query to create the view (Do NOT call .df() here)
        con.execute(render_sql(SQL_PATH / "zoning_rules.sql", rule_string=rule_string))

        # 2. Fetch results with SELECT and convert to DataFrame
        rules = con.execute("SELECT * FROM raw_rules").df()
    finally:
        con.register("zoning_raw", raw_df)

    # separate by use type and filter:
    use_types = set([col.split("_")[0] for col in clean_rule_cols])
    use_types.remove("Affordable")
    use_types.add("Affordable_Housing")
    rules[["use_type", "rule"]] = (
        rules["col_name"].apply(lambda x: split_col(x, use_types)).apply(pd.Series)
    )
    rules = rules.drop(columns="col_name")
    rules["use_type"] = (
        rules["use_type"].map(use_types_remapper).fillna(rules["use_type"])
    )

    # remap booleans
    rules["val"] = rules["val"].map(boolean_remapper).fillna(rules["val"])
    con.register("rules", rules)


def build_full():
    drop_cols = ["geometry", "Shape_Area", "Shape_Length"]
    exclude = ", ".join(drop_cols)
    con.execute(
        f"""--sql
        CREATE OR REPLACE TEMP VIEW wide AS
        SELECT * EXCLUDE ({exclude}) FROM zoning_raw
        """
    )


def build_color():
    con.execute(
        """--sql
        CREATE OR REPLACE TEMP VIEW colors AS
        SELECT *
        FROM (
            VALUES
                ('Residential', '#1f77b4', '[31,119,180,180]'),
                ('Mixed', '#ff7f0e', '[255,127,14,180]'),
                ('Nonresidential', '#2ca02c', '[44,160,44,180]'),
                ('Overlay', '#d62728', '[214,39,40,180]')
        ) AS t(district_type, hex_color, rgba);
        """
    )


def build_empty_geom():
    """
    Build the geometry for the polygons
    *where we don't have zoning information*.

    Requires build/FIPS_data.py to have run first (it writes towns.parquet);
    build/main.py orders them accordingly.
    """

    con.execute("""--sql
        CREATE OR REPLACE TEMP VIEW town_boundaries
        AS SELECT *
        FROM lake.RAW.vt_town_lines
    """)

    # First execute the view creation SQL
    con.execute(render_sql(SQL_PATH / "zoning_empty_geom.sql", min_acres=MIN_GAP_ACRES))

    # Then query the created view into a dataframe
    empty_geom_df = con.execute("SELECT * FROM empty_geom").df()

    con.register("empty_geom", empty_geom_df)


def clean():
    _load_spatial()
    df = read_raw_data()
    build_info()
    build_geom()
    build_rules(df)
    build_empty_geom()
    build_color()
    build_full()

    return df


def add_to_lake():
    """
    Persists each cleaned zoning table (info, geom, rules, empty_geom, wide, colors)
    into the CLEANED schema in DuckLake.
    """
    tables = ["info", "geom", "rules", "empty_geom", "wide", "colors"]
    for name in tables:
        con.execute(
            f"""--sql
            CREATE OR REPLACE TABLE lake.CLEANED.VersoZoning_{name} AS
            SELECT * FROM {name}
            """
        )


def main():
    clean()
    add_to_lake()


if __name__ == "__main__":
    main()
