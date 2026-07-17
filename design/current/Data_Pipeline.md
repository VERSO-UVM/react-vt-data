# Data Pipeline Documentation

This document describes the ETL (Extract, Transform, Load) pipeline used to collect and clean data for this project.

## Overview

As of now, the pipeline is organized into two stages — **data_collection** and **data_cleaning** — orchestrated by master scripts, with data populated in a DuckLake data lake.

backend/
├── ETL/
│   ├── data_collection/
│   │   ├── base.py
│   │   ├── acs5.py
│   │   ├── cdc.py
│   │   ├── demographics.py
│   │   ├── economic.py
│   │   ├── education.py
│   │   ├── flood.py
│   │   ├── historic_population.py
│   │   ├── housing.py
│   │   ├── qcew.py
│   │   ├── wastewater.py
│   │   └── zoning.py
│   ├── data_cleaning/
│   │   ├── clean_cdc.py
│   │   ├── clean_demographics.py
│   │   ├── clean_dependency_ratio.py
│   │   ├── clean_derived_time_series.py
│   │   ├── clean_economic.py
│   │   ├── clean_education.py
│   │   ├── clean_flood.py
│   │   ├── clean_health_insurance_coverage.py
│   │   ├── clean_historic_population.py
│   │   ├── clean_housing.py
│   │   ├── clean_qcew.py
│   │   ├── clean_wastewater.py
│   │   └── clean_zoning.py
│   ├── run_data_collection.py   # Master collection script
│   └── run_data_cleaning.py     # Master cleaning script
└── datastore/
    └── lake_build.py            # lake builder

## Pipeline Stages

### 1. Data Collection

Located in `ETL/data_collection/`, this stage contains one script per data category:

- **acs5** — American Community Survey 5-Year Census B-table data
- **cdc** — CDC data
- **demographics** — Demographic data
- **economic** — Economic indicators
- **education** — Education data
- **flood** — Flood data (FEMA)
- **historic_population** — Historic population data
- **housing** — Housing data
- **qcew** — Quarterly Census of Employment and Wages
- **wastewater** — Wastewater data
- **zoning** — Zoning data

`base.py` holds shared utilities for the ACS 5-Year Census B-table scrapers.

**`run_data_collection.py`** is the master collection script — it runs each individual collector and populates the results into the `lake.RAW` schema. The `lake.RAW` schema itself is built by `datastore/lake_build.py`.

### 2. Data Cleaning

Located in `ETL/data_cleaning/`, all cleaning scripts are prefixed with `clean_`:

- `clean_cdc.py`
- `clean_demographics.py` — includes age dependency ratio and derived time series (median age, median household income, median home value, per capita income, total housing units, vacancy rate, unemployment rate)
- `clean_economic.py`
- `clean_education.py`
- `clean_flood.py`
- `clean_health_insurance_coverage.py`
- `clean_historic_population.py`
- `clean_housing.py`
- `clean_qcew.py`
- `clean_wastewater.py`
- `clean_zoning.py`

**`run_data_cleaning.py`** is the master cleaning script — it sends each `lake.RAW` table through its corresponding cleaning script and populates the cleaned output into the `lake.CLEANED` schema.

## Data Flow
[data_collection scripts] → run_data_collection.py → lake.RAW.{table}
│
▼
run_data_cleaning.py → clean_*.py
│
▼
lake.CLEANED.{table_name}

## Table Naming Convention

Tables follow the pattern:

***{source}_{tableName}_{mode}***

**Sources:** `acs5Economics`, `acs5Housing`, `VersoZoning`, `VersoWastewater`, `VCGI`, `cdc`, `FEMA`, etc.

**Modes:** `timeseries`, `geom`, `info`, `tidy`, `county`, `tract`, `rules`, `colors`, etc.

**Example:** `acs5Economics_income_timeseries`, `VersoZoning_parcels_geom`
