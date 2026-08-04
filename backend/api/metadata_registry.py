"""
Central registry for chart/dataset metadata.

All API routes should pull from here instead of defining metadata inline.
Keys match the route/dataset name convention used throughout the app.
"""

METADATA: dict[str, dict] = {
    "DP TABLES": {
        "source": "U.S. Census Bureau, American Community Survey 5-Year Estimates DP Tables",
        "LastUpdate": "2023",
        "caveats": [
            "5-year estimates reflect averages over the survey period, not point-in-time values.",
            "Lots of inconsistency and variable name changes.",
        ],
    },
    "zoning": {
        "source": "Municipal Zoning Records",
        "lastUpdated": "2024-12",
        "caveats": ["Aggregate district types may overlap in some municipalities."],
    },
    "demographics": {
        "source": "U.S. Census Bureau, American Community Survey 5-Year Estimates (Table B01001)",
        "lastUpdated": "2023",
        "caveats": [
            "5-year estimates reflect averages over the survey period, not point-in-time values.",
        ],
    },
    "education": {
        "source": "U.S. Census Bureau, American Community Survey 5-Year Estimates (Table B15003)",
        "lastUpdated": "2023",
        "caveats": [
            "Estimates for small geographies may have high margins of error.",
        ],
    },
    "housing": {
        "source": (
            "U.S. Census Bureau, American Community Survey 5-Year Estimates "
            "(Tables B25002, B25003, B25077)"
        ),
        "lastUpdated": "2023",
        "caveats": ["Median home values are in nominal survey-year dollars."],
    },
    "labor_force": {
        "source": (
            "U.S. Census Bureau, American Community Survey 5-Year Estimates "
            "(Tables B23025, B23001)"
        ),
        "lastUpdated": "2023",
        "caveats": [
            "Estimates for small geographies may have high margins of error.",
        ],
    },
    "income": {
        "source": (
            "U.S. Census Bureau, American Community Survey 5-Year Estimates "
            "(Tables B19013, B19301)"
        ),
        "lastUpdated": "2023",
        "caveats": [
            "Income values are in nominal dollars (not inflation-adjusted across years)."
        ],
    },
    "unemployment_rate": {
        "source": (
            "U.S. Census Bureau, American Community Survey 5-Year Estimates "
            "(Table B23025)"
        ),
        "lastUpdated": "2023",
        "caveats": ["Estimates for small geographies may have high margins of error."],
    },
    "snapshot": {
        "source": (
            "U.S. Census Bureau, American Community Survey 5-Year Estimates "
            "(Tables DP03, DP04, DP05)"
        ),
        "lastUpdated": "2023",
        "caveats": ["Estimates for small geographies may have high margins of error."],
    },
    "qcew_employment": {
        "source": (
            "U.S. Bureau of Labor Statistics, "
            "Quarterly Census of Employment and Wages (QCEW)"
        ),
        "lastUpdated": "2023-Q4",
        "notes": (
            "Four-quarter moving average of total covered employment, "
            "stacked by NAICS supersector. All ownerships included."
        ),
    },
}


TOPIC_INFO: dict[str, dict] = {
    "Economics": {
        "source": "U.S. Census Bureau, American Community Survey 5-Year Estimates)",
        "tables": {"Selected Economic Characteristics (Table DP04)", ""},
        "LastUpdate": "2023",
        "caveats": [
            "5-year estimates reflect averages over the survey period, not point-in-time values.",
            "Lots of inconsistency and variable name changes.",
        ],
    },
    "Housing": {
        "source": "U.S. Census Bureau, American Community Survey 5-Year Estimates, Selected Housing Characteristics (Table DP04)",
        "LastUpdate": "2023",
        "caveats": [
            "5-year estimates reflect averages over the survey period, not point-in-time values.",
            "Lots of inconsistency and variable name changes.",
        ],
    },
    "Demographics": {
        "source": "U.S. Census Bureau, American Community Survey 5-Year Estimates, Selected Demographic Characteristics (Table DP05)",
        "LastUpdate": "2023",
        "caveats": [
            "5-year estimates reflect averages over the survey period, not point-in-time values.",
            "Lots of inconsistency and variable name changes.",
        ],
    },
    "Zoning": {
        "source": "Municipal Zoning Records",
        "lastUpdated": "2024-12",
        "caveats": ["Aggregate district types may overlap in some municipalities."],
    },
    "demographics": {
        "source": "U.S. Census Bureau, American Community Survey 5-Year Estimates (Table B01001)",
        "lastUpdated": "2023",
        "caveats": [
            "5-year estimates reflect averages over the survey period, not point-in-time values.",
        ],
    },
    "education": {
        "source": "U.S. Census Bureau, American Community Survey 5-Year Estimates (Table B15003)",
        "lastUpdated": "2023",
        "caveats": [
            "Estimates for small geographies may have high margins of error.",
        ],
    },
    "housing": {
        "source": (
            "U.S. Census Bureau, American Community Survey 5-Year Estimates "
            "(Tables B25002, B25003, B25077)"
        ),
        "lastUpdated": "2023",
        "caveats": ["Median home values are in nominal survey-year dollars."],
    },
    "labor_force": {
        "source": (
            "U.S. Census Bureau, American Community Survey 5-Year Estimates "
            "(Tables B23025, B23001)"
        ),
        "lastUpdated": "2023",
        "caveats": [
            "Estimates for small geographies may have high margins of error.",
        ],
    },
    "income": {
        "source": (
            "U.S. Census Bureau, American Community Survey 5-Year Estimates "
            "(Tables B19013, B19301)"
        ),
        "lastUpdated": "2023",
        "caveats": [
            "Income values are in nominal dollars (not inflation-adjusted across years)."
        ],
    },
    "unemployment_rate": {
        "source": (
            "U.S. Census Bureau, American Community Survey 5-Year Estimates "
            "(Table B23025)"
        ),
        "lastUpdated": "2023",
        "caveats": ["Estimates for small geographies may have high margins of error."],
    },
    "snapshot": {
        "source": (
            "U.S. Census Bureau, American Community Survey 5-Year Estimates "
            "(Tables DP03, DP04, DP05)"
        ),
        "lastUpdated": "2023",
        "caveats": ["Estimates for small geographies may have high margins of error."],
    },
    "qcew_employment": {
        "source": (
            "U.S. Bureau of Labor Statistics, "
            "Quarterly Census of Employment and Wages (QCEW)"
        ),
        "lastUpdated": "2023-Q4",
        "notes": (
            "Four-quarter moving average of total covered employment, "
            "stacked by NAICS supersector. All ownerships included."
        ),
    },
}


def get_metadata(key: str) -> dict:
    """Return the metadata dict for the given key, or {} if not found."""
    return METADATA.get(key, {})
