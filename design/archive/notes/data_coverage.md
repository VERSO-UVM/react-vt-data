# Data Coverage Notes

## Longitudinal Data — Hard Floor at 2009

The scrapers in `backend/data_collection/` pull from the **ACS 5-year estimates** via the Census API. The ACS 5-year program began with the 2005–2009 dataset, released in December 2010. **2009 is the earliest year available in this product** and is the hard floor for all longitudinal tables (demographics, education, housing, labor force, income).

Current scraper config: `YEARS = list(range(2009, MAX_YEAR))` in `data_collection/base.py`.

Education data starts at 2012 in practice (earlier tables used different variable structures).

## Why You Can't Simply Extend to Pre-2009

The ACS replaced the decennial Census long-form starting with the 2010 cycle. Before 2009, the equivalent data source is the **Decennial Census long-form** (1970, 1980, 1990, 2000), which is a completely different product with different tables, variable codes, and API endpoints. Bridging the two requires:

- A variable crosswalk for each series across every decade (no standard mapping exists)
- Different Census API endpoints and authentication flows
- Handling suppressed/missing small-area cells — many VT towns are below the reliability threshold in early decades
- Accepting 10-year resolution (1970, 1980, 1990, 2000) spliced with annual ACS (2009–), which creates awkward gaps in trend charts

## Historical Coverage Reference

| Period           | Source                        | Resolution  | Town-level?             |
| ---------------- | ----------------------------- | ----------- | ----------------------- |
| 2009–Present     | ACS 5-year estimates          | Annual      | Yes                     |
| 2005–2008        | ACS 1-year estimates          | Annual      | No (≥65k pop only)      |
| 2000, 2010, 2020 | Decennial Census (short form) | Every 10 yr | Yes (limited variables) |
| 1970–2000        | Decennial Census long-form    | Every 10 yr | Partial                 |
| Pre-1970         | NHGIS / IPUMS summary files   | Every 10 yr | Very sparse             |

## Realistic Path for Pre-2009 Historical Data

If historical depth is needed, the most viable approach is:

1. **NHGIS** (nhgis.org) — pre-harmonized tables for decennial years, downloadable as CSV. County or state level is reliable; town level is sparse pre-1990.
2. Build a separate `data_collection/historical.py` scraper targeting NHGIS or the Decennial Census API. This is not an extension of the current ACS scraper — it is a separate project.
3. Limit historical lookback to **county and state level** for reliability.
4. Display decennial dots on trend charts alongside annual ACS lines, with a clear visual indicator of the source change.

**Bottom line:** 2009 is the practical floor for consistent, town-level, annually-updated data. Do not attempt to extend the current ACS scraper past 2009.
