import pandas as pd
from fastapi import APIRouter

from api.metadata_registry import get_metadata
from api.models import FilterRequest, make_response
from app_utils.db import DB

router = APIRouter()

# Preferred stacking order (bottom → top of the chart)
SECTOR_ORDER = [
    "Goods-producing",
    "Trade, Transportation & Utilities",
    "Education & Health Services",
    "Leisure & Hospitality",
    "Professional & Business Services",
    "Information & Financial Activities",
    "Government",
    "Other Services",
]


@router.post("/load/qcew/employment")
async def employment_by_sector(request: FilterRequest):
    county = (request.filters or {}).get("County", [None])[0]

    query = """
        SELECT year, quarter, quarter_label, sector, employment_4qma
        FROM qcew
        WHERE sector != 'Total'
        {county_filter}
        ORDER BY year, quarter, sector
    """
    if county:
        rows: pd.DataFrame = DB.execute(
            query.format(county_filter="AND County = ?"), [county]
        ).df()
    else:
        rows = DB.execute(query.format(county_filter="")).df()

    if rows.empty:
        return make_response(data=[], metadata=get_metadata("qcew_employment"))

    # Pivot to wide format: one row per quarter_label, one column per sector
    wide = rows.pivot_table(
        index=["year", "quarter", "quarter_label"],
        columns="sector",
        values="employment_4qma",
        aggfunc="sum",
    ).reset_index()
    wide.columns.name = None

    # Re-order sector columns in preferred stacking order; preserve any extras at end
    sector_cols = [s for s in SECTOR_ORDER if s in wide.columns]
    extra_cols = [
        c
        for c in wide.columns
        if c not in ["year", "quarter", "quarter_label"] + sector_cols
    ]
    ordered = wide[["quarter_label"] + sector_cols + extra_cols].copy()

    # Round employment values to whole numbers (keep as float so NaN serializes cleanly)
    for col in sector_cols + extra_cols:
        ordered[col] = ordered[col].round(0)

    metadata = {**get_metadata("qcew_employment"), "county": county}
    return make_response(data=ordered, metadata=metadata)
