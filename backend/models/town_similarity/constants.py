# ============================================================
# CENSUS INDICATORS (2024 ACS5 DATA PROFILE)
# ============================================================

# Housing (DP04)
HOUSING_INDICATORS = [
    "DP04_0003PE",  # Vacant housing units (%)
    "DP04_0005E",  # Rental vacancy rate
    "DP04_0006PE",  # Total housing units (%; units-in-structure universe)
    "DP04_0007PE",  # 1-unit detached housing
    "DP04_0013PE",  # 20 or more units
    "DP04_0022PE",  # Structures built 1970–1979
    "DP04_0023PE",  # Structures built 1960–1969
    "DP04_0024PE",  # Structures built 1950–1959
    "DP04_0025PE",  # Structures built 1940–1949
    "DP04_0026PE",  # Structures built 1939 or earlier
    "DP04_0046PE",  # Owner-occupied housing units
    "DP04_0047PE",  # Renter-occupied housing units
    "DP04_0079PE",  # Occupied housing units with 1.51 or more occupants per room
    "DP04_0081PE",  # Owner-occupied housing units: Value < $50,000
    "DP04_0082PE",  # Owner-occupied housing units: Value $50,000 < $99,999
    "DP04_0085PE",  # Owner-occupied housing units: Value $200,000 < $299,999
    "DP04_0088PE",  # Owner-occupied housing units: Value $1,000,000+
    "DP04_0134E",  # Median gross rent (dollars)
]

# Demographics (DP05)
DEMOGRAPHIC_INDICATORS = [
    "DP05_0001E",  # Total population
    "DP05_0005PE",  # Population under 5 years
    "DP05_0006PE",  # Population 5 to 9 years
    "DP05_0018E",  # Median Age (years)
    "DP05_0021PE",  # Population 18+
    "DP05_0037PE",  # Race: White alone
    "DP05_0045PE",  # Race: Black or African American alone
]

# Social (DP02)
SOCIAL_INDICATORS = [
    "DP02_0015PE",  # Households with one or more people 65 years and over
    "DP02_0016E",  # Average household size
    "DP02_0024PE",  # Other nonrelatives in households
    "DP02_0053PE",  # Population 3+ enrolled in school
    "DP02_0072PE",  # % Civilian noninstitutionalized population with a disability
    "DP02_0092PE",  # % born in a different U.S. state
    "DP02_0068PE",  # % with a bachelor's degree or higher (age 25+)
    "DP02_0061PE",  # 9th to 12th grade, no diploma (age 25+)
]

# Economic (DP03)
ECONOMIC_INDICATORS = [
    "DP03_0005PE",  # % 16+ in the civilian labor force who are unemployed
    "DP03_0006PE",  # % 16+ in the labor force who are in the Armed Forces
    "DP03_0007PE",  # 16+ not in the labor force.
    "DP03_0025E",  # Mean travel time to work (minutes)
    "DP03_0026PE",  # % total civilian employed population 16+
    "DP03_0028PE",  # % of civilian employed population 16+ working in service jobs
    "DP03_0052PE",  # % of total households with income and benefits < $10,000
    "DP03_0053PE",  # % of total households with income and benefits $10,000 < $14,999
    "DP03_0054PE",  # % of total households with income and benefits $15,000 < $24,999
    "DP03_0055PE",  # % of total households with income and benefits $25,000 < $34,999
    "DP03_0062E",  # MEDIAN household income (dollars)
    "DP03_0063E",  # MEAN household income (dollars)
]

# Combined feature selection
SIMILARITY_INDICATORS = (
    HOUSING_INDICATORS
    + DEMOGRAPHIC_INDICATORS
    + SOCIAL_INDICATORS
    + ECONOMIC_INDICATORS
)

SIMILARITY_CATEGORIES = {
    "overall": SIMILARITY_INDICATORS,
    "housing": HOUSING_INDICATORS,
    "demographics": DEMOGRAPHIC_INDICATORS,
    "social": SOCIAL_INDICATORS,
    "economic": ECONOMIC_INDICATORS,
}
