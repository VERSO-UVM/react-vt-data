from datetime import timedelta, timezone

# Fixed UTC-5 (EST, no DST): MAX_YEAR only needs the year, and the year
# boundary always falls in winter.
EASTERN_STD_TIME = timezone(timedelta(hours=-5))
