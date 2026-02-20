Things for Claude to do. After you get each one done, add it to git, commit, and push; feel free to clear context between larger points. Reference this markdown (eg, part 1.1) as you work. Document all design considerations in the appropriate places in the `design` folder.

<!-- 1. Fix links and reloads: pages not loading properly
   1. Reloading pages causes this issue.
   2. also internal links cause this issue, (eg, going directly to exploratory mapping -> zoning from the header works, while going first to exploratory mapping and then on to zoning does not).
2. Mapping improvements:
   1. In all three maps, the "show municipality" button is right next to the map, which looks bad. Put it up above the filter.
   2. Add summary statistics (eg, total land volume of each type using filter) to the map pages.
3. General aesthetics:
   1. Add a centered title for each page at the top. EG, "Data Viewer."
   2. Delete the scratch page and clear its content. Leave setup for future trials.
   3. Rename "Data Viewer" to "Data Analysis"
4. Tables
   1. Add a comparison shader button to the tables. This adds comparison data from the "comparison" part of the profile; calls out that area clearly, and splits each data cell into two: left for home, right for comparison. Make sure this is visually clear; eg, make them different colors or with a different shaded background.
   2. For tables that have a chart component, make that chart feature both main (solid line) and comparison (dashed line) data for the already present variables.
   3. Add in table data specifically for housing tenure.
5. Add in `Data Exploration and Comparison` page
   1. Model off the `compare_tab` function in `app_utils/census_sections.py` --- but for all sections, not just demography or housing, for example.
   2. Supply only one visualization for all comparisons, for now. Make sure that this visualization can be added to the working report; generally use the `ChartItem` paradigm. -->

6. Give a report about which data streams it makes sense to consolidate to duckdb.
7. Review PDF generation. Determine whether current system is properly extensible, or whether we need to have an alternate renderer for chart-items that shows the same data in something that is more easily shaped into proper subcomponent of a PDF.
