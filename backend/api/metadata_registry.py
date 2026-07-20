"""
Central registry for chart/dataset metadata.

All API routes should pull from here instead of defining metadata inline.
Keys match the route/dataset name convention used throughout the app.
"""

METADATA: dict[str, dict] = {
 
    # ---------------------------------------------------------------
    # ACS5 tidy tables
    # ---------------------------------------------------------------
    "acs5_demographics_tidy": {
        "name": "ACS5 Demographics (Tidy)",
        "subject": "Demographics",
        "source": "U.S. Census Bureau, American Community Survey 5-Year Estimates",
        "description": (
            "Selected demographic variables from ACS5 estimates in tidy format."
        ),
        "lastUpdated": "2023",
        "format": "tidy",
        "variables": [
            "Population characteristics",
            "Age distribution",
            "Sex distribution",
        ],
        "caveats": [
            "5-year estimates reflect averages over the survey period, not point-in-time values.",
        ],
    },
 
    "acs5_economics_tidy": {
        "name": "ACS5 Economics (Tidy)",
        "subject": "Labor & Economy",
        "source": "U.S. Census Bureau, American Community Survey 5-Year Estimates",
        "description": (
            "Selected economic variables from ACS5 estimates in tidy format."
        ),
        "lastUpdated": "2023",
        "format": "tidy",
        "variables": [
            "Median Household Income",
            "Median Per Capita Income",
            "Unemployment Rate",
            "Health Insurance Coverage",
        ],
        "caveats": [
            "Income values are reported in nominal survey-year dollars.",
        ],
    },
 
    "acs5_education_tidy": {
        "name": "ACS5 Education (Tidy)",
        "subject": "Education",
        "source": "U.S. Census Bureau, American Community Survey 5-Year Estimates",
        "description": (
            "Selected educational attainment and enrollment variables from "
            "ACS5 estimates in tidy format."
        ),
        "lastUpdated": "2023",
        "format": "tidy",
        "variables": [
            "Educational Attainment",
            "High School Graduate or Higher",
            "Bachelor's Degree or Higher",
            "School Enrollment",
        ],
        "caveats": [
        ],
    },
 
    "acs5_housing_tidy": {
        "name": "ACS5 Housing (Tidy)",
        "subject": "Housing",
        "source": "U.S. Census Bureau, American Community Survey 5-Year Estimates",
        "description": (
            "Selected housing variables from ACS5 estimates in tidy format."
        ),
        "lastUpdated": "2023",
        "format": "tidy",
        "variables": [
            "Total Housing Units",
            "Median Home Value",
            "Housing Vacancy Rates",
            "Owner Vacancy Rate",
            "Rental Vacancy Rate",
        ],
        "caveats": [
            "Median home values are reported in nominal survey-year dollars.",
        ],
    },
 
    # ---------------------------------------------------------------
    # ACS5 derived single-variable timeseries tables
    # ---------------------------------------------------------------
    "acs5Demographics_ageDependencyRatio_timeseries": {
        "name": "ACS5 Age Dependency Ratio (Timeseries)",
        "subject": "Demographics",
        "source": "U.S. Census Bureau, American Community Survey 5-Year Estimates",
        "description": "Age dependency ratio over time, derived from ACS5 estimates.",
        "lastUpdated": "2023",
        "format": "timeseries",
        "variables": ["Age Dependency Ratio"],
        "caveats": [
            "5-year estimates reflect averages over the survey period, not point-in-time values.",
        ],
    },
 
    "acs5Demographics_medianAge_timeseries": {
        "name": "ACS5 Median Age (Timeseries)",
        "subject": "Demographics",
        "source": "U.S. Census Bureau, American Community Survey 5-Year Estimates",
        "description": "Median age over time, derived from ACS5 estimates.",
        "lastUpdated": "2023",
        "format": "timeseries",
        "variables": ["Median Age"],
        "caveats": [
            "5-year estimates reflect averages over the survey period, not point-in-time values.",
        ],
    },
 
    "acs5Economics_healthInsurance_timeseries": {
        "name": "ACS5 Health Insurance Coverage (Timeseries)",
        "subject": "Labor & Economy",
        "source": "U.S. Census Bureau, American Community Survey 5-Year Estimates",
        "description": "Health insurance coverage rate over time, derived from ACS5 estimates.",
        "lastUpdated": "2023",
        "format": "timeseries",
        "variables": ["Health Insurance Coverage"],
        "caveats": [],
    },
 
    "acs5Economics_medianHouseholdIncome_timeseries": {
        "name": "ACS5 Median Household Income (Timeseries)",
        "subject": "Labor & Economy",
        "source": "U.S. Census Bureau, American Community Survey 5-Year Estimates",
        "description": "Median household income over time, derived from ACS5 estimates.",
        "lastUpdated": "2023",
        "format": "timeseries",
        "variables": ["Median Household Income"],
        "caveats": [
            "Income values are reported in nominal survey-year dollars.",
        ],
    },
 
    "acs5Economics_perCapitaIncome_timeseries": {
        "name": "ACS5 Per Capita Income (Timeseries)",
        "subject": "Labor & Economy",
        "source": "U.S. Census Bureau, American Community Survey 5-Year Estimates",
        "description": "Per capita income over time, derived from ACS5 estimates.",
        "lastUpdated": "2023",
        "format": "timeseries",
        "variables": ["Per Capita Income"],
        "caveats": [
            "Income values are reported in nominal survey-year dollars.",
        ],
    },
 
    "acs5Economics_unemploymentRate_timeseries": {
        "name": "ACS5 Unemployment Rate (Timeseries)",
        "subject": "Labor & Economy",
        "source": "U.S. Census Bureau, American Community Survey 5-Year Estimates",
        "description": "Unemployment rate over time, derived from ACS5 estimates.",
        "lastUpdated": "2023",
        "format": "timeseries",
        "variables": ["Unemployment Rate"],
        "caveats": [],
    },
 
    "acs5Housing_housingUnits_timeseries": {
        "name": "ACS5 Total Housing Units (Timeseries)",
        "subject": "Housing",
        "source": "U.S. Census Bureau, American Community Survey 5-Year Estimates",
        "description": "Total housing unit counts over time, derived from ACS5 estimates.",
        "lastUpdated": "2023",
        "format": "timeseries",
        "variables": ["Total Housing Units"],
        "caveats": [],
    },
 
    "acs5Housing_medianHomeValue_timeseries": {
        "name": "ACS5 Median Home Value (Timeseries)",
        "subject": "Housing",
        "source": "U.S. Census Bureau, American Community Survey 5-Year Estimates",
        "description": "Median home value over time, derived from ACS5 estimates.",
        "lastUpdated": "2023",
        "format": "timeseries",
        "variables": ["Median Home Value"],
        "caveats": [
            "Median home values are reported in nominal survey-year dollars.",
        ],
    },
 
    "acs5Housing_vacancyRates_timeseries": {
        "name": "ACS5 Housing Vacancy Rates (Timeseries)",
        "subject": "Housing",
        "source": "U.S. Census Bureau, American Community Survey 5-Year Estimates",
        "description": "Owner and rental vacancy rates over time, derived from ACS5 estimates.",
        "lastUpdated": "2023",
        "format": "timeseries",
        "variables": ["Owner Vacancy Rate", "Rental Vacancy Rate"],
        "caveats": [],
    },
 
    # ---------------------------------------------------------------
    # CDC
    # ---------------------------------------------------------------
    "cdc_edges_county": {
        "name": "CDC PLACES County Edges",
        "subject": "Health",
        "source": "Centers for Disease Control and Prevention (CDC)",
        "description": "Edge/linkage geometry connecting county-level CDC PLACES records to boundaries.",
        "lastUpdated": None,
        "format": "geometry",
        "variables": [],
        "caveats": [
        ],
    },
 
    "cdc_edges_tract": {
        "name": "CDC PLACES Census Tract Edges",
        "subject": "Health",
        "source": "Centers for Disease Control and Prevention (CDC)",
        "description": "Edge/linkage geometry connecting tract-level CDC PLACES records to boundaries.",
        "lastUpdated": None,
        "format": "geometry",
        "variables": [],
        "caveats": [
        ],
    },
 
    "cdc_places_county": {
        "name": "CDC PLACES County Indicators",
        "subject": "Health",
        "source": "Centers for Disease Control and Prevention (CDC)",
        "description": "County-level health indicators from CDC PLACES in open long format.",
        "lastUpdated": None,
        "format": "long",
        "variables": [],
        "caveats": [],
    },
 
    "cdc_places_tract": {
        "name": "CDC PLACES Census Tract Indicators",
        "subject": "Health",
        "source": "Centers for Disease Control and Prevention (CDC)",
        "description": "Census tract-level health indicators from CDC PLACES in open long format.",
        "lastUpdated": None,
        "format": "long",
        "variables": [],
        "caveats": [],
    },
 
    # ---------------------------------------------------------------
    # FEMA
    # ---------------------------------------------------------------
    "FEMA_floodHazard_geom": {
        "name": "FEMA Flood Hazard Areas",
        "subject": "Environment",
        "source": "Federal Emergency Management Agency (FEMA)",
        "description": "Flood hazard area polygons from FEMA flood mapping products.",
        "lastUpdated": None,
        "format": "geometry",
        "variables": [],
        "caveats": [],
    },
 
    # ---------------------------------------------------------------
    # QCEW
    # ---------------------------------------------------------------
    "qcew_sectorEmployment_timeseries": {
        "name": "QCEW Employment by Sector (Timeseries)",
        "subject": "Labor & Economy",
        "source": "U.S. Bureau of Labor Statistics, Quarterly Census of Employment and Wages",
        "description": "Employment estimates by industry sector over time.",
        "lastUpdated": None,
        "format": "timeseries",
        "variables": [],
        "caveats": [],
    },
 
    # ---------------------------------------------------------------
    # VCGI
    # ---------------------------------------------------------------
    "VCGI_historicPopulation_timeseries": {
        "name": "Historic Population Estimates (Timeseries)",
        "subject": "Demographics",
        "source": "Vermont Historical Society, made available by VCGI",
        "description": "Historical population estimates for Vermont municipalities.",
        "lastUpdated": None,
        "format": "timeseries",
        "variables": [],
        "caveats": [],
    },
 
    # ---------------------------------------------------------------
    # Wastewater / Zoning (VERSO/ORCA pod — not part of CLEANED tree,
    # kept per confirmation that these are legitimate separate datasets)
    # ---------------------------------------------------------------
    "ww_treatment_facilities": {
        "name": "Wastewater Treatment Facilities",
        "subject": "Infrastructure",
        "source": "VERSO / ORCA Wastewater Infrastructure Mapping Pod",
        "description": "Locations and attributes of wastewater treatment facilities.",
        "lastUpdated": None,
        "format": None,
        "variables": [],
        "caveats": [],
    },
 
    "ww_soil_suitability": {
        "name": "Wastewater Septic Soil Suitability",
        "subject": "Infrastructure",
        "source": "VERSO / ORCA Wastewater Infrastructure Mapping Pod",
        "description": "Soil suitability information for septic systems.",
        "lastUpdated": None,
        "format": None,
        "variables": [],
        "caveats": [],
    },
 
    "ww_stormwater": {
        "name": "Stormwater Management Areas",
        "subject": "Infrastructure",
        "source": "VERSO / ORCA Wastewater Infrastructure Mapping Pod",
        "description": "Mapped stormwater management infrastructure.",
        "lastUpdated": None,
        "format": None,
        "variables": [],
        "caveats": [],
    },
 
    "ww_service_areas": {
        "name": "Wastewater Service Areas",
        "subject": "Infrastructure",
        "source": "VERSO / ORCA Wastewater Infrastructure Mapping Pod",
        "description": "Wastewater service areas and coverage boundaries.",
        "lastUpdated": None,
        "format": None,
        "variables": [],
        "caveats": [],
    },
 
    "zoning": {
        "name": "Zoning Districts",
        "subject": "Land Use",
        "source": "UVM VERSO / ORCA Zoning Atlas Pod",
        "description": "Municipal zoning districts collected and standardized across Vermont.",
        "lastUpdated": None,
        "format": None,
        "variables": [],
        "caveats": [],
    },
}


def get_metadata(key: str) -> dict:
    """Return the metadata dict for the given key, or {} if not found."""
    return METADATA.get(key, {})
