"""
Readable names for Census Data Profile variables whose labels don't tell
them apart.

Some DP rows share a label word for word within a year, e.g. in 2010-2012
the median monthly owner costs with and without a mortgage (DP04_0100E and
DP04_0107E) are both "SELECTED MONTHLY OWNER COSTS (SMOC)!!Median (dollars)";
Census only nests them under "Housing units with/without a mortgage" from
2013 (issue #106). dp_variable_names.csv names such variables so charts can
label each value.

Each CSV row covers one variable for a range of years, since
Census reuses codes for different things across vintages (DP04_0114 is
"Not computed" through 2014 but a percentage bin from 2015). The variable is
the code without its measure suffix, so one row names the estimate (E),
percent (PE) and their margins (M, PM). To name another collision, add rows
for each code involved.
"""

import re
from functools import cache
from pathlib import Path

import pandas as pd

NAMES_CSV = Path(__file__).with_name("dp_variable_names.csv")

# Census measure suffixes on a DP variable code: estimate, percent, margins.
_SUFFIX = re.compile(r"(PE|PM|E|M)$")


@cache
def _names() -> dict[str, list[tuple[int, int, str]]]:
    """variable -> [(first_year, last_year, name), ...]"""
    names: dict[str, list[tuple[int, int, str]]] = {}
    for row in pd.read_csv(NAMES_CSV).itertuples():
        names.setdefault(row.variable, []).append(
            (int(row.first_year), int(row.last_year), row.name)
        )
    return names


def variable_name(variable_code: str | None, year: int) -> str | None:
    """The readable name for a DP variable code in a year, if one is listed."""
    if not variable_code:
        return None
    variable = _SUFFIX.sub("", variable_code)
    for first, last, name in _names().get(variable, []):
        if first <= year <= last:
            return name
    return None


def add_variable_names(rows: pd.DataFrame) -> pd.DataFrame:
    """Add a variable_name column (None where no name is listed) to rows with
    year and variable_code columns."""
    rows = rows.copy()
    # An object column, so unnamed rows stay None (JSON null) rather than
    # pandas turning them into NaN, which isn't valid JSON.
    rows["variable_name"] = pd.Series(
        [
            variable_name(code, int(year))
            for code, year in zip(rows["variable_code"], rows["year"], strict=True)
        ],
        index=rows.index,
        dtype="object",
    )
    return rows
