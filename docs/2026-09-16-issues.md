# Data and pipeline findings — 2026-09-16

These 17 follow-ups concern the underlying Census and zoning data, collection,
cleaning, and build logic. They retain the review IDs **A1–A9** and **B1–B8**.
They are distinct from the MCP interface fixes: better discovery, warnings,
projections, or geography matching do not repair the stored warehouse or its
upstream sources.

Verification used read-only queries against `backend/Data/warehouse.duckdb`, local
source CSV/parquet/FlatGeobuf files, and the checked-in collection/cleaning code.
The inspected warehouse has 4,228,110 combined ACS profile rows and 1,739 zoning
districts; its MCP version is `f5b8aa17e3c58fa4a357726c`, with modification time
2026-09-16 18:58 UTC. Counts below describe that snapshot. The database and source
files were not changed. No current municipal ordinance or remote source release
was verified as part of this review.

**Priority:** P1 means incorrect identity, ambiguous observations, or a confirmed
derived-data omission; P2 means material interpretation, coverage, or provenance
work; P3 means precision, documentation, or a new convenience dataset. A finding
marked **source verification needed** is not a conclusion that the source value
is wrong.

SQL examples operate on a read-only warehouse connection. Examples that use
`read_csv_auto` or `read_parquet` assume the repository root is the working
directory. Source paths in links are relative to this document.

## Triage

| Priority | IDs                            | Work                                                                                                                                            |
| -------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | A1, A3, B1, B2                 | Recover observation identity, restore valid owner-burden years, and reconcile zoning geography.                                                 |
| P2       | A2, A4, A5, A6, A8, B3, B4, B5 | Normalize versioned Census semantics; document gaps, units, missingness and lineage; align zoning fields; verify the Burlington overlay record. |
| P3       | A7, A9, B6, B7, B8             | Round derived display precision, design additional series, and clarify inventory semantics.                                                     |

## Census profiles and derived series

### A1 — P1: profile selector keys are not unique

**Confirmed.** Grouping `acs5_dp_combined_tidy` by
`(NAME, year, table, Category, Subcategory, Variable, Measure)` produces **64,008
duplicate groups**, containing 132,480 rows and 68,472 rows beyond one per group.
**37,739 groups contain different values**, so removing duplicates arbitrarily
would discard distinct observations. Duplicate-group counts are DP02 8,928;
DP03 16,740; DP04 8,864; DP05 29,476.

```sql
WITH duplicates AS (
    SELECT NAME, year, "table", Category, Subcategory, Variable, Measure,
           count(*) AS n, count(DISTINCT Value) AS value_count
    FROM acs5_dp_combined_tidy
    GROUP BY ALL HAVING count(*) > 1
)
SELECT count(*), sum(n), sum(n - 1),
       count(*) FILTER (WHERE value_count > 1)
FROM duplicates;
```

For Burlington's DP04 selected monthly owner costs, the selector
`Category='SELECTED MONTHLY OWNER COSTS (SMOC)'`,
`Subcategory='Median (dollars)'`, `Variable='Total'`, `Measure='Estimate'` returns
both **1,731 and 699 in 2011**, and **1,764 and 737 in 2012**. The local wide source
keeps them distinguishable as `DP04_0100E` and `DP04_0107E` respectively.

**Cause boundary.** [The Census label utility](../backend/app_utils/census.py)
splits labels into a fixed hierarchy and drops `Code`, `Name`, and `Label` after
melting. [The combined-profile cleaner](../backend/data_cleaning/clean_acs5.py)
retains only the resulting labels, geography name, year, table, and value. Loss
of source-code identity is confirmed; the exact contribution of each year's
source-label hierarchy still needs a code/metadata crosswalk.

**Next action and acceptance test.** Retain source variable codes and full source
labels, then define a year-aware, lossless observation key. Resolve mortgage and
non-mortgage concepts from those codes before offering one logical series.
Regression fixtures must keep both Burlington medians distinct. Enforce
uniqueness on the repaired key, not by deleting rows until today's lossy label
key happens to be unique.

### A2 — P2: one logical indicator has several selector vocabularies

**Confirmed.** Burlington's median gross rent appears under three estimate
selectors; the table is DP04 in each case:

| Present years | Category     | Subcategory                  | Variable                                       | Measure    |
| ------------- | ------------ | ---------------------------- | ---------------------------------------------- | ---------- |
| 2009          | `Estimate`   | `GROSS RENT`                 | `Occupied units paying rent: Median (dollars)` | `Number`   |
| 2011–2012     | `GROSS RENT` | `Median (dollars)`           | `Total`                                        | `Estimate` |
| 2013–2024     | `GROSS RENT` | `Occupied units paying rent` | `Median (dollars)`                             | `Estimate` |

DP04 percentage labels are `Percent` except **2017–2018**, which use `Percent
Estimate`. A selector tied to one spelling cannot represent the whole logical
series. This is distinct from a legitimately absent geography/year in A4.

```sql
SELECT year, list(DISTINCT Measure ORDER BY Measure)
FROM acs5_dp_combined_tidy WHERE "table" = 'DP04'
GROUP BY year ORDER BY year;
```

**Next action and acceptance test.** Build a crosswalk from year-specific source
codes and universes to stable indicator identities, retaining the original code
and labels. [Collection](../backend/data_collection/acs5.py) already obtains labels
per year; [the label utility](../backend/app_utils/census.py) is the place where
identity is currently discarded. Normalizing measure spellings alone will not
repair A1 or A5. Test a median-rent series across the three layouts and publish
each variant's actual coverage; do not silently merge rows solely because their
labels look similar.

### A3 — P1: owner housing-burden derivation drops 2017 and 2018

**Confirmed.** `acs5Housing_incomeBurden_timeseries` contains 2013–2016 and
2019–2024: 271 rows per year through 2022, then 272 in 2023 and 2024. It contains
no 2017 or 2018 rows. [The cleaner](../backend/data_cleaning/clean_housing_cost_burden.py)
requires `Measure = 'Percent'`; the corresponding source rows in those two years
use `Percent Estimate`.

For Burlington's mortgage-owning units where SMOCAPI is computable:

| Year | 30.0–34.9% bracket | 35.0% or more bracket | Sum of source percentages |
| ---- | ------------------ | --------------------- | ------------------------- |
| 2017 | 9.9                | 22.5                  | **32.4%**                 |
| 2018 | 9.7                | 20.6                  | **30.3%**                 |

These values also match `DP04_0114PE` and `DP04_0115PE` in the local wide CSV for
those years. They are reproducible source sums, not newly published observations.

```sql
SELECT year, Variable, Measure, Value
FROM acs5_dp_combined_tidy
WHERE NAME = 'Burlington city, Chittenden County, Vermont'
  AND "table" = 'DP04' AND year IN (2017, 2018)
  AND Category LIKE '%SMOCAPI%'
  AND Subcategory =
      'Housing units with a mortgage (excluding units where SMOCAPI cannot be computed)'
  AND Variable IN ('30.0 to 34.9 percent', '35.0 percent or more')
  AND Measure = 'Percent Estimate'
ORDER BY year, Variable;
```

**Next action and acceptance test.** Support the verified measure variants or a
validated code crosswalk; normalize sentinels before summing (A6). Require both
eligible bracket observations to be valid, unique, and in the same universe.
Test Burlington's two missing years and missing-component cases. Compare output
coverage only with years/geographies where all required inputs exist; do not
require every derived series to cover every year in its parent table.

### A4 — P2: 2010 DP04 coverage excludes county subdivisions

**Confirmed; collection cause unresolved.** `dp_housing` and the combined table
contain only **16 geographies in 2010**: 14 counties, Vermont, and the United
States. Other years have 271 geographies through 2022 and 272 in 2023–2024.
The available local `vt_acs5_Housing_data.csv` has **14 county rows for 2010 and
no county-subdivision rows**. Its possession of some 2010 data does not prove
that the tidy transform discarded towns.

```sql
SELECT year, geo_type, count(DISTINCT NAME)
FROM dp_housing WHERE year = 2010
GROUP BY year, geo_type ORDER BY geo_type;

SELECT year, geo_type, count(*)
FROM read_csv_auto('backend/Data/Census/vt_acs5_Housing_data.csv')
WHERE year = 2010 GROUP BY year, geo_type;
```

**Next action and acceptance test.** Trace the collection inputs and archived
geography requests in [the profile collector](../backend/data_collection/acs5.py),
then verify source availability before backfilling. Publish observed coverage
by geography and year, including genuine missing combinations. A regression
test should distinguish an unavailable town-year from a valid zero value and
from available county/state data. Do not infer source availability from the
dataset's minimum and maximum years.

### A5 — P2: percentage-labelled total cells contain valid counts

**Confirmed.** Some source total/universe cells use a percentage-labelled column
while retaining a unit count. For Burlington:

| Source year/code                    | Value             | Context                                                        |
| ----------------------------------- | ----------------- | -------------------------------------------------------------- |
| 2011 `DP04_0134E` and `DP04_0134PE` | **9,418** in both | GRAPI rent-paying units for which the percentage is computable |
| 2017 `DP04_0110E` and `DP04_0110PE` | **4,047** in both | Corresponding SMOCAPI units with a mortgage                    |
| 2017 `DP04_0117E` and `DP04_0117PE` | **2,162** in both | Corresponding SMOCAPI units without a mortgage                 |

The combined table labels these `Percent` or `Percent Estimate`. The values
match the local wide source; they must not be discarded or changed to zero
merely because they exceed 100. Conversely, some 2011 bracket percentages also
have `Variable='Total'`, so that label alone cannot identify a universe count.

**Next action and acceptance test.** Carry units and statistical role from
year-specific source metadata through [the label utility](../backend/app_utils/census.py)
and [combined-profile cleaning](../backend/data_cleaning/clean_acs5.py). Preserve
the numeric count and label it as a universe/count where validated. Test these
three cells alongside a true 2011 bracket percentage. Apply percentage-range
checks only to indicators established to be percentages, not all `PE` codes or
all rows with a percentage-like label.

### A6 — P2: warehouse missing-value normalization is incomplete

**Confirmed.** Combined-profile `Value` is `VARCHAR`. Numeric conversion reveals
258,078 occurrences of `-888888888`, 48,533 of `-666666666`, and 2,047 of
`-999999999`; another 24,390 values are `(X)`. These counts include decimal-text
spellings such as `-666666666.0`, which an exact string comparison misses.

```sql
SELECT TRY_CAST(Value AS DOUBLE) AS sentinel, count(*)
FROM acs5_dp_combined_tidy
WHERE TRY_CAST(Value AS DOUBLE) <= -100000000
GROUP BY sentinel ORDER BY sentinel;

SELECT pct_housing_burden, count(*)
FROM acs5Housing_incomeBurden_timeseries
WHERE pct_housing_burden < 0 GROUP BY pct_housing_burden;
-- -1333333332.0: 66 rows
```

There is also a confirmed aggregation defect: **66 owner-burden rows equal
−1,333,333,332**, the sum of two `-666666666` sentinels. Averill town in 2013 is
one example. [The burden cleaner](../backend/data_cleaning/clean_housing_cost_burden.py)
sums first, then replaces only the original single sentinel. The current MCP
normalizes such values to null when serving them, but other consumers read the
stored values directly.

**Next action and acceptance test.** Normalize documented Census sentinel and
annotation forms before arithmetic, preserve missingness reasons/raw values,
and provide a numeric cleaned measure. Review
[profile cleaning](../backend/data_cleaning/clean_acs5.py) and all affected
derived cleaners. Tests should cover string and numeric forms, two missing
components, one missing component, and a real zero. Do not reinterpret unknown
text as a real zero or treat an incomplete sum as a complete observation.

### A7 — P3: owner-burden sums expose floating-point noise

**Confirmed.** 431 stored burden values differ from rounding to one decimal;
the largest difference is approximately `1.42e-14`. For example, Chelsea town's
2013 value is `25.799999999999997`.

```sql
SELECT NAME, year, pct_housing_burden
FROM acs5Housing_incomeBurden_timeseries
WHERE pct_housing_burden <> round(pct_housing_burden, 1)
LIMIT 5;
```

**Next action and acceptance test.** After valid-input aggregation in
[the cleaner](../backend/data_cleaning/clean_housing_cost_burden.py), choose and
document decimal precision consistent with the source's one-decimal
percentages. Verify representative sums and missing values. This presentation
precision issue is separate from the invalid sentinel sums in A6.

### A8 — P2: served and legacy paths need explicit lineage

**Confirmed, with a correction to the initial interpretation.** The served
median-home-value series comes from the curated **B-table housing input**, not
from the DP profile table. The median-household-income series likewise comes
from a B-table input. Numerically similar DP variables are not evidence of the
actual pipeline's source.

| Served dataset/table                                                          | Actual collection and derivation                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `acs5_ts_median_home_value` / `acs5Housing_medianHomeValue_timeseries`        | `B25077_001E` in [housing collection](../backend/data_collection/housing.py), `lake.RAW.housing`, then [derived-series cleaning](../backend/data_cleaning/clean_derived_time_series.py).                                                                             |
| `acs5_ts_household_income` / `acs5Economics_medianHouseholdIncome_timeseries` | `B19013_001E` in [economic collection](../backend/data_collection/economic.py), `lake.RAW.economic`, then the same derived-series cleaner.                                                                                                                           |
| `acs5_ts_income_burden` / `acs5Housing_incomeBurden_timeseries`               | DP04 profile labels selected by [the burden cleaner](../backend/data_cleaning/clean_housing_cost_burden.py); the two bracket codes are `DP04_0114PE` and `DP04_0115PE` for the verified 2017–2018 examples. Code applicability across other years needs a crosswalk. |

The served home-value table covers **2009–2024, 4,338 rows**. Its values match the
`Median Home Value` rows of `acs5_housing_tidy` after the existing sentinel
replacement. The legacy [build configuration](../backend/build/acs5.py) instead
reads `Data/Census/med_home_value_by_year.csv` into `median_home_value`; that local
CSV covers **2009–2023, 3,826 rows**. Burlington's 2023 value is 400,200 in both
paths; the served 2024 value is 444,800. The current
[REST query configuration](../backend/query/acs5.py) and
[MCP catalog](../backend/data_tools/catalog.py) select the newer named table.

**Next action and acceptance test.** Document or retire the legacy build path
after checking its remaining callers. Maintain lineage from collection code,
source variable/universe and year, through cleaner and warehouse table. Test
catalog/query mappings against the intended production table and compare
overlapping observations. Do not demand equal coverage from a stale archive and
the current warehouse, or cite DP profile analogues as the actual B-table source.

### A9 — P3: rent and owner-cost convenience series are absent

**Confirmed; enhancement rather than missing raw values.** There is no served
convenience series for median gross rent, mortgage/non-mortgage median owner
costs, or renter cost burden. Relevant profile observations exist, subject to
A1–A6. The legacy `med_smoc_by_year.csv` has 7,652 rows for 2009–2023 and two
variables, `Mortgaged SMOC` and `Non-Mortgaged SMOC`, but its legacy
`median_smoc` table is not in the current warehouse/catalog.

**Next action and acceptance test.** Agree indicator definitions, denominators,
thresholds, source tables, and geography coverage before adding series. In
particular, owner burden with a mortgage is not renter burden, and a 30%+
threshold is not a 35%+ threshold. Add known-place/year fixtures spanning source
layout changes, missingness, and separate mortgage statuses. See
[the legacy configuration](../backend/build/acs5.py),
[current housing collection](../backend/data_collection/housing.py), and
[the current catalog](../backend/data_tools/catalog.py).

## Zoning inventory

The identity and whitespace findings below also occur in both local source
files, `backend/Data/zoning/vt_zoning.parquet` and
`backend/Data/zoning/vt-zoning-update.fgb`. Comparing the parquet to
`VersoZoning_info` by `OBJECT_ID` yields no GEOID differences and no municipality
differences after trimming. This places the observed defects upstream of MCP;
it does not establish the state of the latest remote inventory. The current
[collector](../backend/data_collection/zoning.py) fetches the FlatGeobuf from the
Vermont Zoning Atlas repository.

### B1 — P1: four city jurisdictions carry their town's GEOID

**Confirmed against the warehouse boundary lookup.** Both zoning tables use:

| Municipality      | District rows | Stored GEOID, belonging to town | City GEOID in `vt_town_lines_geom` |
| ----------------- | ------------- | ------------------------------- | ---------------------------------- |
| Barre City        | 17            | `5002303250`                    | `5002303175`                       |
| Newport City      | 9             | `5001948925`                    | `5001948850`                       |
| Rutland City      | 19            | `5002161300`                    | `5002161225`                       |
| Saint Albans City | 10            | `5001161750`                    | `5001161675` (`St. Albans city`)   |

No zoning rows carry those four city GEOIDs. Barre Town and City share 27 rows
under the town ID; Saint Albans Town and City share 20. Direct ID matching can
therefore omit a city or combine it with its distinct town.

```sql
SELECT trim(Municipal_Name), GEO_ID, count(*)
FROM VersoZoning_info WHERE Municipal_Name LIKE '% City%'
GROUP BY ALL ORDER BY 1;

SELECT FIPS_ID, TOWN_NAME FROM vt_town_lines_geom
WHERE FIPS_ID IN ('5002303175','5001948850','5002161225','5001161675');
```

**Next action and acceptance test.** Reconcile each affected source jurisdiction
against authoritative geography, preserving the original ID and correction
provenance. [Zoning cleaning](../backend/data_cleaning/clean_zoning.py) currently
passes `GEO_ID` through. Test these four explicit city/town pairs for separation.
Do not impose global one-name-per-GEOID uniqueness: village zoning jurisdictions
may intentionally use a parent town's Census subdivision ID, which needs an
explicit jurisdiction-to-geography relationship.

### B2 — P1: 132 district records have no geographic identifier

**Confirmed.** Missing-GEOID records include all **44 South Burlington** districts,
17 `Stowe Town`, 12 `North Bennington`, 9 each `Morristown` and
`Enosburgh Enosburg Falls`, 8 `Stowe Town Stowe Village`, and **3 blank-name**
records. The remaining records have `Bennington Landgrove` (6), `Saint George`
(6), `Hyde Park Town Hyde Park Village` (6), `Huntington` (7), `Old Bennington`
(1), `Warren Gore` (3), and `Sandgate F2` (1).

```sql
SELECT Municipal_Name, count(*) FROM VersoZoning_info
WHERE GEO_ID IS NULL GROUP BY Municipal_Name ORDER BY Municipal_Name;
```

**Cause boundary.** Composite-looking names already exist in the local raw
inventory. That does not prove a join/string-concatenation defect: a name could
describe combined jurisdictional coverage. The cause needs source-owner review.

**Next action and acceptance test.** Resolve unambiguous cases against source
records and geography, and represent multi-jurisdiction coverage explicitly.
Keep unresolved records visible with a missing-ID reason; do not invent IDs or
split composite names automatically. Add fixtures for South Burlington, an
ambiguous composite, a village, and a blank name. Coordinate with
[zoning collection](../backend/data_collection/zoning.py) and
[cleaning](../backend/data_cleaning/clean_zoning.py).

### B3 — P2: wide zoning municipality names retain trailing whitespace

**Confirmed.** `VersoZoning_wide` has trailing whitespace in **1,738 of 1,739**
`Municipal_Name` values; `VersoZoning_info` has none. Consequently raw SQL exact
filters such as `Municipal_Name='Burlington'` disagree between tables.

```sql
SELECT count(*),
       count(*) FILTER (WHERE Municipal_Name <> trim(Municipal_Name))
FROM VersoZoning_wide;
```

**Confirmed cause.** Both [current cleaning](../backend/data_cleaning/clean_zoning.py)
and [legacy building](../backend/build/zoning.py) trim the info dataframe, while
the wide view selects raw columns without that normalization.

**Next action and acceptance test.** Normalize documented identifier/text fields
consistently in the shared cleaning path, retaining source text where necessary.
Test matching municipality values between the two tables by `OBJECT_ID` and
repeat an exact Burlington filter. Request-side trimming improves usability but
does not clean data consumed by SQL clients or notebooks.

### B4 — P2: classification normalization is applied to only one zoning table

**Confirmed; the crosswalk is intentional code, not unexplained data drift.**
[The info SQL](../backend/data_cleaning/sql/zoning_info.sql) maps source types;
the wide view preserves them:

| Wide/source type            | Info type        | Rows |
| --------------------------- | ---------------- | ---- |
| `Primarily Residential`     | `Residential`    | 496  |
| `Mixed with Residential`    | `Mixed`          | 800  |
| `Nonresidential`            | `Nonresidential` | 336  |
| `Overlay not Affecting Use` | `Overlay`        | 106  |
| `Overlay`                   | `Overlay`        | 1    |

All 1,739 rows agree with this crosswalk when joined by `OBJECT_ID`. A join on
that stable district identifier does not require matching classification text;
grouped comparisons or a join using `District_Type` can still mislead.

**Next action and acceptance test.** Expose distinct source and normalized
classification fields or apply one documented convention consistently. Test
the crosswalk and `OBJECT_ID` join coverage; do not silently collapse the
original `Overlay not Affecting Use` meaning without retaining it.

### B5 — P2: verify Burlington's high-density residential overlay flag

**Stored facts confirmed; municipal source verification needed.** `OBJECT_ID=1045`
is Burlington's `Residential - High Density` record. It has
`District_Type='Residential'`, `Overlay_District='Yes'`,
`Elderly_Housing_District='Yes'`, `Base_Density=40`, and **86.109949 acres**.
The recorded `Bylaw_Date` is 2023-07-29. The flag is also present in the local
FlatGeobuf source.

```sql
SELECT OBJECT_ID, District_Name, District_Type, Overlay_District,
       Elderly_Housing_District, Base_Density, Acres, Bylaw_Date
FROM VersoZoning_info WHERE OBJECT_ID = 1045;
```

Excluding overlays leaves four Burlington residential records totaling
2,174.716496 acres and omits this record. That explains the summary; it does
**not** establish whether the inventory flag or district interpretation is
legally correct.

**Next action and acceptance test.** Compare the record with the applicable
Burlington ordinance, map, effective date, and source methodology, then record
the outcome and any correction. A reviewed fixture should preserve that
decision. Do not enforce `Overlay_District='Yes'` only when a district's name
contains “Overlay”: overlay status and dominant-use classification can be
independent attributes.

### B6 — P3: clarify “not mapped” records with computed acreage

**Confirmed; semantics unresolved.** There are **36** records with
`District_Mapped='No'` and positive info acreage, totaling **126,116.875337 acres**.
Burlington's `Neighborhood Mixed Use`, `OBJECT_ID=1041`, contributes
47.813540 acres.

```sql
SELECT count(*), sum(Acres) FROM VersoZoning_info
WHERE lower(trim(District_Mapped)) = 'no' AND Acres > 0;
```

[The info SQL](../backend/data_cleaning/sql/zoning_info.sql) computes acreage from
geometry independently of `District_Mapped`. Thus a nonzero area is not proof
that either field is wrong; the geometry may have a different interpretation
than the inventory's mapping-status flag.

**Next action and acceptance test.** Obtain and publish the flag's source
definition and the relevant geometry provenance. Test documented rules rather
than assuming “not mapped” always means no geometry or zero acreage.

### B7 — P3: notes mix inventory commentary with interpretation

**Confirmed.** Notes include first-person working commentary. For example,
Montpelier's `Residential 3000 District`, `OBJECT_ID=1415`, describes inferring
where development requirements apply. Maximum stored note length is **1,647
characters in info and 1,649 in wide**. These fields should not be mistaken for
ordinance text or independently verified legal interpretation.

```sql
SELECT OBJECT_ID, District_Name, Notes FROM VersoZoning_info
WHERE OBJECT_ID = 1415;
```

**Next action and acceptance test.** Retain useful source notes with an explicit
inventory/analyst-note label, provenance, and review status. Make long notes an
intentional report choice rather than silently treating them as findings.
[The cleaner](../backend/data_cleaning/clean_zoning.py) currently passes notes
through. Test that quotations remain distinguishable from source law and that
projection can omit notes without losing district identity.

### B8 — P3: density units, derivation, and missingness need documentation

**Confirmed; a universal formula is not established.** `Base_Density` is present
for 7 of 19 Burlington districts and 9 of 14 Montpelier districts; it is null
for **all 19 Rutland City districts**. Montpelier values include 0.5, 5, 7.26,
8.71, 10.89, 14.52, and 29.04. Some are numerically consistent with dwelling units
per acre derived from lot areas, such as `43560 / 1500 = 29.04`, but neither
[the current cleaner](../backend/data_cleaning/clean_zoning.py) nor
[the legacy builder](../backend/build/zoning.py) calculates this field: both pass
it through from the source.

```sql
SELECT Municipal_Name, count(*) AS district_count,
       count(Base_Density) AS populated_density_count,
       list(DISTINCT Base_Density ORDER BY Base_Density)
FROM VersoZoning_info
WHERE Municipal_Name IN ('Burlington','Montpelier','Rutland City')
GROUP BY Municipal_Name ORDER BY Municipal_Name;
```

**Next action and acceptance test.** Verify units and applicability by district
and housing form, including whether density is direct, derived, conditional,
unrestricted, or uncaptured. Keep those states distinct. Test known reviewed
examples and a missing-value case; do not interpret a null as “no density
standard” or infer a universal conversion from coincidentally matching values.

## Completion criteria for the data follow-up

1. Make corrections in a reproducible collection/cleaning path and retain source
   codes, input versions, and correction provenance. Do not patch only one local
   database and leave the next build to recreate the same issue.
2. Add targeted fixtures for the confirmed edge cases above. Treat genuine
   geography changes, source coverage gaps, village jurisdictions, and missing
   source observations explicitly instead of imposing blanket completeness or
   uniqueness rules.
3. Rebuild a separate candidate warehouse, compare affected datasets with the
   current snapshot, and review changed counts, units, coverage, and identities
   before rollout. Record source-owner/municipal verification separately from
   code tests.
4. Re-run report workflows with source citations and revised caveats. Transport
   warnings and metadata are useful safeguards while this work is open; they do
   not certify or amend source data.
