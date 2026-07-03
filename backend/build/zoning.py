"""
**Author**:
    Fitz Koch
**Created**:
    2026-06-01
**Description**:
    Build script to convert the `zoning_update.fgb` into four SQL tables.
"""

import numpy as np
import pandas as pd

from build import BACKEND, CON, data_dir
from sql_render import render_sql

proc_dir = BACKEND / "Data" / "_Processed" / "zoning"
sql_path = BACKEND / "build" / "sql"


def func_x(x: np.ndarray) -> int:
    return 5


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

geom_cols = ["OBJECT_ID", "geom"]

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


# functions:
def data_load():
    path = data_dir / "zoning" / "vt-zoning-update.fgb"
    CON.execute(f"""--sql
        CREATE OR REPLACE VIEW zoning_raw AS 
        SELECT * EXCLUDE(OGC_FID) 
        FROM ST_READ('{path}')
    """)


def build_info():
    info_string = ", ".join(info_cols)
    CON.execute(render_sql(sql_path / "zoning_info.sql", info_string=info_string))
    info_df = CON.execute("SELECT * FROM raw_info").df()
    str_cols = info_df.select_dtypes("object").columns
    info_df[str_cols] = info_df[str_cols].apply(lambda c: c.str.strip())
    CON.register("info", info_df)


def build_geom():
    geo_string = ", ".join(geom_cols)
    CON.execute(f"""--sql
        CREATE OR REPLACE VIEW geom AS
        SELECT {geo_string}
        FROM zoning_raw
    """)


def get_rule_cols():
    dropped_cols = ["Shape_Area", "Shape_Length"]
    all_cols = CON.execute("DESCRIBE zoning_raw").df()["column_name"].tolist()
    rule_cols = set(all_cols)
    for item in geom_cols + info_cols + ["Acres"] + dropped_cols:
        if item in rule_cols:
            rule_cols.remove(item)
    rule_cols = list(rule_cols)
    return rule_cols


def split_col(col: str, use_types: set[str]):
    for use_type in use_types:
        if col.startswith(use_type):
            rule = col[len(use_type) + 1 :]
            rule = rule.replace("/", "_")
            return use_type, rule
    return False, False


def build_rules():
    # get basic rule columns, etc.
    rule_cols = get_rule_cols()
    clean_rule_cols = [col.replace("/", "_") for col in rule_cols]
    rule_strings = [
        f'CAST("{rule_col}" AS VARCHAR) AS {clean_col}'
        for rule_col, clean_col in zip(rule_cols, clean_rule_cols, strict=True)
    ]
    rule_string = ", ".join(rule_strings)
    CON.execute(render_sql(sql_path / "zoning_rules.sql", rule_string=rule_string))
    rules = CON.execute("SELECT * FROM raw_rules").df()

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
    CON.register("rules", rules)


def build_full():
    drop_cols = ["geom", "Shape_Area", "Shape_Length"]
    exclude = ", ".join(drop_cols)
    CON.execute(f"""--sql
        CREATE OR REPLACE VIEW wide AS
        SELECT * EXCLUDE ({exclude}) FROM zoning_raw
    """)


def build_color():
    CON.execute((sql_path / "zoning_colors.sql").read_text())


def main():
    data_load()
    build_info()
    build_geom()
    build_rules()
    build_color()
    build_full()
    proc_dir.mkdir(parents=True, exist_ok=True)
    for table in ["info", "geom", "rules", "colors", "wide"]:
        CON.execute(
            f"COPY (SELECT * FROM {table}) TO '{proc_dir / f'{table}.parquet'}' "
        )


if __name__ == "__main__":
    main()
