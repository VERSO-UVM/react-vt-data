"""
**Author**:
    Fitz Koch
**Created**:
    2026-06-01
**Description**:
    Runs all the build scripts one after the other.
"""

from build import FIPS_data, acs5, cdc, parcels, wastewater, zoning


def main():
    acs5.main()
    cdc.main()
    # FIPS_data writes vermont/towns.parquet, which zoning's "no zoning
    # information here" layer subtracts the districts from -- so it runs first.
    FIPS_data.main()
    zoning.main()
    parcels.main()
    wastewater.main()


if __name__ == "__main__":
    main()
