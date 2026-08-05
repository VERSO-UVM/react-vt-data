"""
**Author**:
    Fitz Koch
**Created**:
    2026-06-01
**Description**:
    Runs all the build scripts one after the other.
"""

from build import acs5, cdc, wastewater, zoning


def main():
    acs5.main()
    cdc.main()
    zoning.main()
    wastewater.main()


if __name__ == "__main__":
    main()
