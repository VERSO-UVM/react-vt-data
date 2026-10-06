"""
**Description**:
    Precomputes which FEMA flood hazard zone each parcel touches, so the API
    never has to run the (~1 minute) statewide parcel/flood spatial join.
    Runs after clean_parcels and clean_flood (modules run alphabetically);
    reads their CLEANED tables from the lake.
"""

import duckdb


def build_parcels_flood(con: duckdb.DuckDBPyConnection) -> None:
    """
    One row per parcel that intersects a FEMA zone, keeping its highest-risk
    zone. Parcels outside every mapped zone have no row.

    Joined one town at a time, against only the flood polygons in that town's
    bounding box: the statewide join gets OOM-killed in the cleaning container.
    """
    con.execute(
        """--sql
        CREATE OR REPLACE TEMP TABLE flood_ranked AS
        SELECT
            ST_SIMPLIFYPRESERVETOPOLOGY(f.geometry, 0.00005) AS geometry,
            f.flood_risk,
            f.flood_zone_type,
            f.special_flood_hazard_zone,
            r.rank
        FROM lake.CLEANED.FEMA_floodHazard_geom AS f
        INNER JOIN (
            VALUES ('High', 1), ('Moderate', 2), ('Undetermined', 3), ('Minimal', 4)
        ) AS r (risk, rank) ON f.flood_risk = r.risk
        """
    )
    con.execute(
        """--sql
        CREATE OR REPLACE TEMP TABLE parcels_flood (
            object_id BIGINT,
            flood_risk VARCHAR,
            flood_zone_type VARCHAR,
            special_flood_hazard_zone BOOLEAN
        )
        """
    )
    towns = [
        row[0]
        for row in con.execute(
            "SELECT DISTINCT town FROM lake.CLEANED.VCGIParcels_geom"
        ).fetchall()
    ]
    for town in towns:
        con.execute(
            """--sql
            CREATE OR REPLACE TEMP TABLE tp AS
            SELECT object_id, geometry
            FROM lake.CLEANED.VCGIParcels_geom
            WHERE town = ?
            """,
            [town],
        )
        con.execute(
            """--sql
            CREATE OR REPLACE TEMP TABLE tf AS
            SELECT *
            FROM flood_ranked
            WHERE ST_INTERSECTS(
                geometry, (SELECT ST_EXTENT_AGG(geometry)::GEOMETRY FROM tp)
            )
            """
        )
        con.execute(
            """--sql
            INSERT INTO parcels_flood
            SELECT
                tp.object_id,
                ARG_MIN(tf.flood_risk, tf.rank),
                ARG_MIN(tf.flood_zone_type, tf.rank),
                BOOL_OR(tf.special_flood_hazard_zone)
            FROM tp
            INNER JOIN tf ON ST_INTERSECTS(tf.geometry, tp.geometry)
            GROUP BY tp.object_id
            """
        )


def add_to_lake(con: duckdb.DuckDBPyConnection) -> None:
    con.execute(
        """--sql
        CREATE OR REPLACE TABLE lake.CLEANED.VCGIParcels_flood AS
        SELECT * FROM parcels_flood
        """
    )
    con.execute("DROP TABLE IF EXISTS parcels_flood")


def main(con: duckdb.DuckDBPyConnection) -> None:
    build_parcels_flood(con)
    add_to_lake(con)


if __name__ == "__main__":
    main()
