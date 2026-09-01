"""
**Author**:
    Atticus Tarleton
**Created**:
    2026-07-20
**Description**:
    Build script to convert the ambulance service area files into SQL tables.
"""

from lake_build import con

# hardcoded specifics:
ambulance_info_cols = [
    "OBJECTID",
    "Serv_Name",
    "Cert_Level",
    "Address",
    "Street_1",
    "Street_2",
    "City",
    "State",
    "Zip_Code",
    "Total_Tran",
    "Per_No_Tran",
    "Re_Per_Tran",
    "Cost_Per",
    "Cost_Call",
]

ambulance_geom_cols = [
    "OBJECTID",
    "Shape__Area",
    "Shape__Length",
    "geometry",
]


# functions:


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


def read_raw_data():
    raw_df = con.execute(
        """--sql
        SELECT * FROM lake.RAW.ambulance
        """
    ).df()
    return raw_df


def build_ambulance_info_table():
    info_string = ", ".join(ambulance_info_cols)

    con.execute(
        f"""--sql
        CREATE OR REPLACE VIEW info AS
        SELECT {info_string}
        FROM lake.RAW.ambulance
        """
    )


def build_ambulance_geom_table():
    geom_string = ", ".join(ambulance_geom_cols)

    con.execute(f"""--sql
      CREATE OR REPLACE VIEW geom AS
      SELECT {geom_string}
      FROM lake.RAW.ambulance
    """)


def build_ambulance_color_table():
    con.execute("""--sql
    CREATE TABLE colors (
        certification_level   TEXT PRIMARY KEY,
        hex_color       TEXT NOT NULL,
        rgba            TEXT NOT NULL  -- '[255,127,14,180]' as JSON-ish text
    );

    INSERT INTO colors VALUES
        ('Paramedic',         '#2ca02c', '[44, 160, 44, 180]'),
        ('Advanced EMT',   '#ffcc00', '[255, 204, 0, 180]'),
        ('Paramedic - Critical Care Endorsement',   '#fd7e14', '[253, 126, 20, 180]')
    """)


def clean():
    _load_spatial()
    read_raw_data()
    build_ambulance_info_table()
    build_ambulance_geom_table()
    build_ambulance_color_table()


def add_to_lake():
    """
    Persists each cleaned ambulance table (info, geom, color)
    into the CLEANED schema in DuckLake.
    """
    tables = ["info", "geom", "colors"]
    for name in tables:
        con.execute(
            f"""--sql
            CREATE OR REPLACE TABLE lake.CLEANED.VCGI_ambulanceService_{name} AS
            SELECT * FROM {name}
            """
        )


## Putting everything together
def main():
    clean()
    add_to_lake()


if __name__ == "__main__":
    main()
