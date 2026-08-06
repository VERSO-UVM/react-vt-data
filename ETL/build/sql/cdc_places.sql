SELECT
    * EXCLUDE (
        Geolocation,
        StateDesc,
        Data_Value_Footnote_Symbol,
        Data_Value_Footnote,
        DataSource
    ),
    CASE
        WHEN DataValueTypeID = 'CrdPrv' AND Measure IN ({{ indicators }})
            THEN TRUE
        ELSE FALSE
    END AS SME_Highlight
FROM read_csv('{{ path }}')
WHERE DataValueTypeID = 'CrdPrv'
