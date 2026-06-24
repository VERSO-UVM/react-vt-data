"""
**Author**:
    Fitz Koch
**Created**:
    2026-06-23
**Description**:
    Short description
"""

import json
import logging
from pathlib import Path

from api.models import FilterSource
from query.core_functions import (
    sql_filter_block,
)
from query.processed_db import DB

logger = logging.getLogger(__name__)
sql_dir = Path(__file__).resolve().parent / "sql" / "cdc"


def get_cdc_geojson(sources: list[FilterSource]):
    sql = sql_filter_block(sql_dir / "places.sql", sources=sources)
    rows = DB.execute(sql).df()
    if rows.empty:
        logger.error("geo query returned no rows for filters: %s", sources)
        raise ValueError(f"no results for filters: {sources}")

    RAMP = [
        [254, 229, 217, 255],
        [252, 174, 145, 255],
        [251, 106, 74, 255],
        [222, 45, 38, 255],
        [165, 15, 21, 255],
    ]

    features = []
    for r in rows.itertuples():
        features.append(
            {
                "type": "Feature",
                "geometry": json.loads(r.geometry),
                "properties": {
                    "rgba_color": RAMP[int(r.bin)],
                    "tooltip": {"__title__": r.Measure, "value": r.Data_Value},
                },
            }
        )
    return {"type": "FeatureCollection", "features": features}
