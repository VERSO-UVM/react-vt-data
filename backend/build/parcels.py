"""
**Author**:
    Isaac Wedaman
**Created**:
    2026-07-23
**Description**:
    Build script to convert the CDC-places csv data into a single vermont-based SQL table.
"""

from pathlib import Path

from build import BACKEND, CON

data_directory = Path("Data")
parcels_fgb = Path("Data/parcels/parcels_f.fgb")
parcel_path = data_directory / "parcels" / "parcels_vermont.geojson"


proc_dir = BACKEND / "Data" / "_Processed" / "parcels"
TABLES = ["geom", "info"]
INFO_COLS = [
    "OBJECTID",
    "SPAN",
    "CAT",
    "RESCODE",
    "PARCID",
    "CITYGL",
    "TOWN",
    "ZIPGL",
    "PROPTYPE",
    "DESCPROP",
    "SOURCENAME",
    "YEAR",
    "ACRESGL",
    "REAL_FLV",
    "HSTED_FLV",
    "IMPRV_LV",
]


def load_dataset():
    if not parcels_fgb.exists():
        CON.execute(f"""
            COPY (
                SELECT * FROM ST_Read('{parcel_path}')
                WHERE geom IS NOT NULL
            )
            TO '{parcels_fgb}' (FORMAT GDAL, DRIVER 'FlatGeobuf')
        """)
    CON.execute(
        "CREATE OR REPLACE VIEW parcels_raw AS SELECT * FROM ST_Read('Data/Parcels/parcels_f.fgb')"
    )

    CON.execute("""
    CREATE OR REPLACE VIEW final_view AS
    SELECT 
        * EXCLUDE (TOWN),
        UPPER(TOWN) AS TOWN,
    FROM parcels_raw;
    """)


def load_geom():
    CON.execute("""
    CREATE OR REPLACE VIEW geom AS
    SELECT OBJECTID, geom FROM final_view
    """)


def load_info():
    CON.execute("""CREATE OR REPLACE VIEW info AS
    SELECT OBJECTID, SPAN, CAT, RESCODE, PARCID, CITYGL, TOWN, ZIPGL, PROPTYPE, DESCPROP, SOURCENAME, YEAR,
    ACRESGL, REAL_FLV, HSTED_FLV, IMPRV_LV
    FROM final_view""")


def final_writing():
    path = Path("Data/_Processed/parcels")
    path.mkdir(parents=True, exist_ok=True)
    for item in ["info", "geom"]:
        CON.execute(
            f"COPY (SELECT * FROM {item}) TO '{path / f'{item}.parquet'}' (FORMAT PARQUET)"
        )


def main():
    load_dataset()
    load_geom()
    load_info()
    final_writing()


if __name__ == "__main__":
    main()
