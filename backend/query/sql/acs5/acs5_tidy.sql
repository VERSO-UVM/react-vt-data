SELECT
    year,
    Section,
    Variable,
    Value,
    Percent
FROM {table}
{where_string}
ORDER BY year, Section, Variable