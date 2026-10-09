// chartDefs.ts\
import { BASE_API_URL } from '@/config';
import { ChartParams, TableColumnConfig } from '@/types/cachedCharts';

const YEAR_MAX_OVERALL = new Date().getFullYear() - 2;

export interface TableRowDef {
  label: string;
  variable: string;
  section?: string;
}

export interface TableConfig {
  variable?: string;
  extraParams?: Record<string, unknown>; // year_min, year_max, etc.
}

export interface ChartDef {
  id: string;
  title: string;
  xField: string;
  yField: string;
  subtype: string;
  trendChart?: string; // optional trend chart component name for table-primary defs
  categories?: string[]; // topic areas for interest-based filtering
  chartParams?: ChartParams;
  url: string;
  filterKey?: string;
  dataKey?: string;
  notes?: string;
  showCols?: TableColumnConfig[];
  tableConfig?: TableConfig;
}

export const chartDefs: ChartDef[] = [
  {
    id: 'acreage',
    title: 'Acreage by Zoning District Type',
    notes:
      'Total acres of land in each type of zoning district, from town zoning maps. Overlay districts add extra rules on top of a regular district, so their acres overlap with other districts and the bars can add up to more than a town’s land area. Land with no zoning on record is not shown.',
    categories: ['Land Use'],
    xField: 'District Type',
    yField: 'Acres',
    subtype: 'CompareDiffPerXBarChart',
    chartParams: { color: 'hex_color', legendLabels: ['Main', 'Compare'] },
    url: `${BASE_API_URL}/load/data/zoning/aggregated`,
    filterKey: 'aggregated_acres',
    showCols: [
      { key: 'County' },
      { key: 'Jurisdiction District Name' },
      { key: 'District Type' },
      { key: 'Acres', label: 'Total Acres' },
      { key: 'hex_color', visible: false },
    ],
  },
  {
    id: 'zoning_lot_size',
    title: 'Minimum Lot Size for a Single-Family Home: Share of Zoned Land',
    notes:
      'The smallest lot a town’s zoning allows for a new single-family home, shown as the share of zoned land at each size. Only districts that allow single-family homes (outright or after a public hearing) are included, and larger districts count more. Districts with no lot size on record are left out. Two- to four-family homes have nearly identical requirements, so only single-family is shown.',
    categories: ['Land Use'],
    xField: 'Minimum Lot Size',
    yField: 'Share of Acres',
    subtype: 'CompareDiffPerXBarChart',
    chartParams: {
      legendLabels: ['Main', 'Compare'],
      yLabel: 'Share of zoned acres (%)',
      percentFormat: true,
    },
    url: `${BASE_API_URL}/load/data/zoning/lot-sizes`,
    filterKey: 'zoning_lot_size',
    showCols: [
      { key: 'County' },
      { key: 'Jurisdiction' },
      { key: 'Jurisdiction District Name' },
      { key: 'District Type' },
      { key: 'Acres' },
      { key: 'Minimum Lot Size (ac)' },
    ],
  },
  {
    id: 'zoning_allowance',
    title: 'Zoning Allowance Acreage by Unit Type',
    notes:
      'Acres of residential and mixed-use zoning districts, grouped by whether each housing type is permitted. “Allowed” means permitted outright. “May be Allowed” means approval is needed first, such as a conditional use or public hearing. “Prohibited” means not allowed, and “Not Mentioned” means the town’s bylaw does not address it. Only one- to four-family homes are shown.',
    categories: ['Land Use'],
    xField: 'use_type',
    yField: 'Acres',
    subtype: 'ZoningAllowanceStackedBarChart',
    chartParams: {
      legendLabels: ['Allowed', 'Conditional', 'Not Allowed', 'Public Hearing'],
      color: 'hex_color',
    },
    url: `${BASE_API_URL}/load/data/zoning/allowances`,
    filterKey: '',
    showCols: [
      { key: 'use_type', label: 'Residential Type' },
      { key: 'val', label: 'Zoning Outcome' },
      { key: 'Acres', label: 'Total Acres' },
    ],
  },
  {
    id: 'parcel_land_use',
    title: 'How Land Is Used: Total Acres by Land Use Type',
    notes:
      'Total acres in each land-use class, based on the class each town assigns to a parcel for property taxes. Residential includes homes on large rural lots and mobile homes on land, Commercial includes apartment buildings, and Seasonal means vacation homes. Other combines miscellaneous and unclassified parcels, and parcels with no class are left out.',
    categories: ['Land Use'],
    xField: 'Land Use',
    yField: 'Acres',
    subtype: 'CompareDiffPerXBarChart',
    chartParams: { legendLabels: ['Main', 'Compare'], yLabel: 'Acres' },
    url: `${BASE_API_URL}/load/data/parcels/by-category`,
    filterKey: 'parcel_category_acres',
    showCols: [
      { key: 'County' },
      { key: 'Jurisdiction' },
      { key: 'Land Use' },
      { key: 'Parcels' },
      { key: 'Acres', label: 'Total Acres' },
    ],
  },
  {
    id: 'parcel_flood_exposure',
    title: 'Land in High-Risk Flood Zones: Acres by Land Use',
    notes:
      'Land in parcels that touch a FEMA high-risk flood zone, meaning an area with at least a 1% chance of flooding in any year (often called the “100-year floodplain”). A parcel counts with its full acreage even if only part of it is in the zone.',
    categories: ['Land Use'],
    xField: 'Land Use',
    yField: 'Acres',
    subtype: 'CompareDiffPerXBarChart',
    chartParams: { legendLabels: ['Main', 'Compare'], yLabel: 'Acres' },
    url: `${BASE_API_URL}/load/data/parcels/high-flood-risk`,
    filterKey: 'parcel_flood_acres',
    showCols: [
      { key: 'County' },
      { key: 'Jurisdiction' },
      { key: 'Land Use' },
      { key: 'Parcels' },
      { key: 'Acres', label: 'Acres in High-Risk Zone' },
    ],
  },
  {
    id: 'parcel_value_per_acre',
    title: 'Land Value by Land Use: Median Assessed Value per Acre',
    notes:
      'The middle value (median) of each parcel’s assessed value divided by its acres, so half of parcels are worth more per acre and half less. Assessed value is the town’s property-tax valuation, which can differ from what a property would sell for. Residential and seasonal land are split at 6 acres because small lots are worth far more per acre. Parcels with no assessed value, and mobile homes without land, are left out.',
    categories: ['Land Use'],
    xField: 'Land Use',
    yField: 'Value Per Acre',
    subtype: 'CompareDiffPerXBarChart',
    chartParams: {
      legendLabels: ['Main', 'Compare'],
      yLabel: 'Dollars per acre ($)',
    },
    url: `${BASE_API_URL}/load/data/parcels/value-per-acre`,
    filterKey: 'parcel_value_per_acre',
    showCols: [
      { key: 'County' },
      { key: 'Jurisdiction' },
      { key: 'Land Use' },
      { key: 'Parcels' },
      { key: 'Value Per Acre', label: 'Median Value Per Acre ($)' },
    ],
  },
  {
    id: 'parcel_owner_type',
    title: 'Who Owns the Land: Share of Parcels by Owner Residency',
    notes:
      'Share of parcels by where the owner lives, based on the owner’s mailing address in town property tax records. “Town resident” means the owner lives in the town where the parcel is. Corporations and other organizations are shown separately wherever they are located. Parcels with no owner information are left out.',
    categories: ['Land Use'],
    xField: 'Owner Type',
    yField: 'Share of Parcels',
    subtype: 'CompareDiffPerXBarChart',
    chartParams: {
      legendLabels: ['Main', 'Compare'],
      yLabel: 'Share of parcels (%)',
      percentFormat: true,
    },
    url: `${BASE_API_URL}/load/data/parcels/owner-type`,
    filterKey: 'parcel_owner_type',
    showCols: [
      { key: 'County' },
      { key: 'Jurisdiction' },
      { key: 'Owner Type' },
      { key: 'Parcels' },
      { key: 'Acres' },
    ],
  },
  {
    id: 'demographics',
    title: 'Changes in Age Composition',
    notes:
      'The share of residents under 18 and age 65 or older over time. Based on American Community Survey (ACS) 5-year estimates, which are less precise for small towns.',
    url: `${BASE_API_URL}/load/acs5-db/tidy/demographics`,
    xField: '',
    yField: '',
    subtype: 'renderTable', // signals to the renderer to use TableStack not ChartStack
    trendChart: 'DemographicsTrendChart',
    categories: ['Demographics'],
    filterKey: '',
    dataKey: '',
    tableConfig: {
      extraParams: { year_min: 2010, year_max: 2023 },
    },
  },
  // Age Distribution (Bar Graph)
  {
    id: 'age_distribution',
    title: 'Age Distribution',
    notes:
      'The share of residents in each age group, using the most recent American Community Survey (ACS) 5-year estimate. These are survey-based estimates rather than exact counts, and they are less precise for small towns.',
    categories: ['Demographics'],
    xField: 'Variable',
    yField: 'Percent',
    subtype: 'CompareDiffPerXBarChart',
    chartParams: {
      legendLabels: ['Main', 'Compare'],
      fixedYear: YEAR_MAX_OVERALL,
      percentFormat: true,
      includeCategories: [
        'Under 18',
        '18 to 24',
        '25 to 34',
        '35 to 44',
        '45 to 54',
        '55 to 64',
        '65 to 74',
        '75 plus',
      ],
    },
    url: `${BASE_API_URL}/load/acs5-db/tidy/demographics`,
    filterKey: '',
  },
  {
    id: 'demographics_population',
    title: 'Historic Population Estimates',
    notes:
      'Population from each 10-year U.S. Census, going back to 1791. Counts are for the census year only, so changes between censuses are not shown.',
    url: `${BASE_API_URL}/load/acs5-db/timeseries/demographics/historic-population`,
    xField: '',
    yField: '',
    subtype: 'renderTableEstimates', // signals to the renderer to use TableStack not ChartStack
    trendChart: 'PopulationTrendChart',
    categories: ['Demographics'],
    filterKey: '',
    dataKey: '',
    tableConfig: {},
  },
  {
    id: 'historic_population_change',
    title: 'Population Change (100-Year Trend)',
    notes:
      'How much a place’s population grew or shrank from one 10-year U.S. Census to the next, shown as a percentage. It covers about 200 years, so recent changes can look small next to earlier swings.',
    url: `${BASE_API_URL}/load/acs5-db/timeseries/demographics/historic-population-change`,
    xField: '',
    yField: '',
    subtype: 'renderTableEstimates',
    trendChart: 'HistoricPopulationChangeTrendChart',
    categories: ['Demographics'],
    filterKey: '',
    dataKey: '',
    tableConfig: {},
  },
  {
    id: 'population_change',
    title: 'Population Change by Year',
    notes:
      'The percent change in estimated population compared with the previous year. Based on American Community Survey (ACS) 5-year estimates. In small towns, a big swing may just reflect survey error.',
    url: `${BASE_API_URL}/load/acs5-db/timeseries/demographics/population-change`,
    xField: '',
    yField: '',
    subtype: 'renderTableEstimates',
    trendChart: 'PopulationChangeTrendChart',
    categories: ['Demographics'],
    filterKey: '',
    dataKey: '',
    tableConfig: {
      extraParams: { year_min: 2010, year_max: 2023 },
    },
  },
  {
    id: 'demographics_estimates',
    title: 'Demographics Summary Table',
    notes:
      'A summary of population characteristics from American Community Survey (ACS) 5-year estimates. These are survey-based estimates, not exact counts, and they are less precise for small towns.',
    url: `${BASE_API_URL}/load/acs5-db/tidy/demographics`,
    xField: '',
    yField: '',
    subtype: 'renderTableEstimates',
    categories: ['Demographics'],
    filterKey: '',
    dataKey: '',
    tableConfig: {
      extraParams: { year_min: 2010, year_max: 2023 },
    },
  },
  {
    id: 'median_age',
    title: 'Median Age',
    notes:
      'The age that splits residents in half: half are older and half are younger. Based on American Community Survey (ACS) 5-year estimates.',
    url: `${BASE_API_URL}/load/acs5-db/timeseries/demographics/median-age`,
    xField: '',
    yField: '',
    subtype: 'renderTableEstimates',
    trendChart: 'MedianAgeTrendChart',
    categories: ['Demographics'],
    filterKey: '',
    dataKey: '',
    tableConfig: {
      extraParams: { year_min: 2010, year_max: 2023 },
    },
  },
  // Age Area Chart (Annual, stacked by age group)
  {
    id: 'age_area',
    title: 'Age Distribution - Trend',
    notes:
      'The number of residents in each age group over time, stacked so the full height is the total population. Based on American Community Survey (ACS) 5-year estimates, which are less precise for small towns. Click a legend item to hide an age group.',
    categories: ['Demographics'],
    xField: 'year',
    yField: 'Value',
    subtype: 'AgeAreaChart',
    chartParams: { noViewSwitch: true },
    url: `${BASE_API_URL}/load/acs5-db/tidy/demographics`,
  },
  {
    id: 'education_trend',
    title: 'Educational Attainment – Trend',
    notes:
      'The share of adults 25 and older by the highest level of education they have completed. Based on American Community Survey (ACS) 5-year estimates, which are less precise for small towns.',
    url: `${BASE_API_URL}/load/acs5-db/tidy/education`,
    xField: '',
    yField: '',
    subtype: 'renderTable',
    trendChart: 'EducationTrendChart',
    categories: ['Education'],
    filterKey: '',
    dataKey: '',
    tableConfig: {
      extraParams: { year_min: 2012, year_max: 2023 },
    },
  },
  // Education (Bar Graph)
  {
    id: 'education_distribution',
    title: 'Educational Attainment – Distribution',
    notes:
      'The share of adults 25 and older by the highest level of education they have completed, using the most recent American Community Survey (ACS) 5-year estimate.',
    categories: ['Education'],
    xField: 'Variable',
    yField: 'Percent',
    subtype: 'CompareDiffPerXBarChart',
    chartParams: {
      legendLabels: ['Main', 'Compare'],
      fixedYear: YEAR_MAX_OVERALL,
      percentFormat: true,
    },
    url: `${BASE_API_URL}/load/acs5-db/tidy/education`,
    filterKey: '',
  },
  // Housing
  {
    id: 'home_value',
    title: 'Median Home Value',
    notes:
      'The middle (median) value of owner-occupied homes, so half are worth more and half less. Values are what homeowners estimated in the American Community Survey (ACS), not sale prices or tax assessments. Each year is reported in that year’s dollars, so changes include inflation.',
    url: `${BASE_API_URL}/load/acs5-db/tidy/housing`,
    xField: '',
    yField: '',
    subtype: 'renderTableEstimates',
    trendChart: 'HomeValueTrendChart',
    categories: ['Housing'],
    filterKey: '',
    dataKey: '',
    tableConfig: {
      extraParams: { year_min: 2010, year_max: 2023 },
    },
  },
  {
    id: 'housing_units',
    title: 'Total Housing Units',
    notes:
      'The total number of housing units, such as houses, apartments, and mobile homes, whether occupied or vacant. This includes seasonal and vacation homes, so it is not the same as the number of households. Based on American Community Survey (ACS) 5-year estimates.',
    url: `${BASE_API_URL}/load/acs5-db/tidy/housing`,
    xField: '',
    yField: '',
    subtype: 'renderTableEstimates',
    trendChart: 'HousingUnitsTrendChart',
    categories: ['Housing'],
    filterKey: '',
    dataKey: '',
    tableConfig: {
      extraParams: { year_min: 2010, year_max: 2023 },
    },
  },
  {
    id: 'housing_tenure',
    title: 'Renter-Occupied Unit Rate',
    notes:
      'The share of occupied homes that are rented rather than owned. Vacant homes are not counted. Based on American Community Survey (ACS) 5-year estimates.',
    url: `${BASE_API_URL}/load/acs5-db/tidy/housing`,
    xField: '',
    yField: '',
    subtype: 'renderTableEstimates',
    trendChart: 'HousingTenureAreaChart',
    categories: ['Housing'],
    filterKey: '',
    dataKey: '',
    tableConfig: {
      extraParams: { year_min: 2010, year_max: 2023 },
    },
  },
  {
    id: 'housing_income_burden',
    title: 'Housing Cost Burden (30%+ of Income)',
    notes:
      'The share of households spending 30% or more of their income on housing, a common threshold for being “cost-burdened.” Housing costs mean rent for renters, and mortgage, taxes, and insurance for owners. Based on American Community Survey (ACS) 5-year estimates.',
    url: `${BASE_API_URL}/load/acs5-db/timeseries/housing/income-burden`,
    xField: '',
    yField: '',
    subtype: 'renderTable',
    trendChart: 'HousingIncomeBurdenChart',
    categories: ['Housing'],
    filterKey: '',
    dataKey: '',
    tableConfig: {
      extraParams: { year_min: 2010, year_max: 2023 },
    },
  },

  // Labor Force
  {
    id: 'labor_force_trend_16plus',
    title: 'Labor Force Participation (Ages 16+)',
    notes:
      'The share of people age 16 and older who have a job or are actively looking for one. People who are retired, in school, or not looking for work are not counted, so towns with many retirees tend to have lower rates. Based on American Community Survey (ACS) 5-year estimates.',
    url: `${BASE_API_URL}/load/acs5-db/tidy/labor-force`,
    xField: '',
    yField: '',
    trendChart: 'LaborForceTrendChart',
    subtype: 'renderTable',
    categories: ['Labor & Economy'],
    filterKey: '',
    dataKey: '',
    tableConfig: {
      extraParams: { year_min: 2010, year_max: 2023 },
    },
  },
  {
    id: 'labor_force_trend_prime_age',
    title: 'Labor Force Participation (Ages 25-54)',
    notes:
      'The share of people ages 25 to 54 who have a job or are actively looking for one. This age range leaves out most students and retirees, so it gives a clearer picture of how many working-age adults are in the workforce. Based on American Community Survey (ACS) 5-year estimates.',
    url: `${BASE_API_URL}/load/acs5-db/tidy/labor-force`,
    xField: '',
    yField: '',
    trendChart: 'LaborForceTrendChartPrimeAge',
    subtype: 'renderTable',
    categories: ['Labor & Economy'],
    filterKey: '',
    dataKey: '',
    tableConfig: {
      extraParams: { year_min: 2010, year_max: 2023 },
    },
  },
  // Unemployment Rate
  {
    id: 'unemployment_rate',
    title: 'Unemployment Rate',
    notes:
      'The share of people in the labor force who do not have a job but are actively looking for one. People who have stopped looking are not counted. Based on American Community Survey (ACS) 5-year estimates, which average five years, so these rates will not match monthly unemployment reports.',
    url: `${BASE_API_URL}/load/acs5-db/tidy/labor-force`,
    xField: '',
    yField: '',
    subtype: 'renderTable',
    trendChart: 'UnemploymentTrendChart',
    categories: ['Labor & Economy'],
    filterKey: '',
    dataKey: '',
    tableConfig: {
      extraParams: { year_min: 2010, year_max: 2023 },
    },
  },
  // Median Earnings
  {
    id: 'earnings',
    title: 'Median Earnings by Sex',
    notes:
      'The middle (median) yearly earnings of workers, so half earn more and half less. The male and female lines include only full-time, year-round workers, while the all-workers line includes part-time and seasonal workers. Each year is reported in that year’s dollars, so changes include inflation.',
    url: `${BASE_API_URL}/load/acs5-db/timeseries/economics/median-earnings`,
    xField: '',
    yField: '',
    subtype: 'renderTableEstimates',
    trendChart: 'EarningsTrendChart',
    categories: ['Labor & Economy'],
    filterKey: '',
    dataKey: '',
    tableConfig: {
      extraParams: { year_min: 2010, year_max: 2023 },
    },
  },
  // Employment (QCEW quarterly, stacked by sector)
  {
    id: 'employment',
    title: 'Total Employment by Sector',
    notes:
      'The number of jobs in each industry sector, reported by county, from state unemployment insurance records (QCEW). Each point averages the past four quarters to smooth out seasonal swings. Jobs are counted where the workplace is, not where workers live, and self-employed people are not included.',
    categories: ['Labor & Economy'],
    xField: 'quarter_label',
    yField: 'employment_4qma',
    subtype: 'EmploymentAreaChart',
    chartParams: { noViewSwitch: true },
    url: `${BASE_API_URL}/load/qcew/employment`,
  },
  // Median Household Income
  {
    id: 'median_hh_income',
    title: 'Median Household Income',
    notes:
      'The middle (median) yearly income of households, so half earn more and half less. A household’s income includes everyone living together. Each year is reported in that year’s dollars, so changes include inflation.',
    url: `${BASE_API_URL}/load/acs5-db/timeseries/economics/median-hh-income`,
    xField: '',
    yField: '',
    categories: ['Labor & Economy'],
    trendChart: 'HouseholdIncomeTrendChart',
    subtype: 'renderTableEstimates',
    filterKey: '',
    dataKey: '',
    tableConfig: {
      extraParams: { year_min: 2010, year_max: 2023 },
    },
  },
  // Per Capita Income
  {
    id: 'per_capita_income',
    title: 'Per Capita Income',
    notes:
      'Total income divided by the number of people, including children and others with no income. It is usually lower than household income and is affected by household size. Each year is reported in that year’s dollars, so changes include inflation.',
    url: `${BASE_API_URL}/load/acs5-db/timeseries/economics/per-capita-income`,
    xField: '',
    yField: '',
    categories: ['Labor & Economy'],
    trendChart: 'PerCapitaIncomeTrendChart',
    subtype: 'renderTableEstimates',
    filterKey: '',
    dataKey: '',
    tableConfig: {
      extraParams: { year_min: 2010, year_max: 2023 },
    },
  },
];
