// chartDefs.ts\
import { BASE_API_URL } from '@/config';
import { TableColumnConfig } from '@/types/cachedCharts';

export interface TableRowDef {
  label: string;
  variable: string;
  section?: string;
}

export interface TableConfig {
  variable?: string;
  extraParams?: Record<string, any>; // year_min, year_max, etc.
}

export interface ChartDef {
  id: string;
  title: string;
  xField: string;
  yField: string;
  subtype: string;
  trendChart?: string; // optional trend chart component name for table-primary defs
  categories?: string[]; // topic areas for interest-based filtering
  chartParams?: any;
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
    categories: ['Land Use'],
    xField: 'District Type',
    yField: 'Acres',
    subtype: 'CompareDiffPerXBarChart',
    chartParams: { color: 'hex_color', legendLabels: ['Main', 'Compare'] },
    url: `${BASE_API_URL}/load/data/zoning/aggregated`,
    filterKey: 'aggregated_acres',
    notes: 'Acreage is defined as a good time.',
    showCols: [
      { key: 'County' },
      { key: 'Jurisdiction District Name' },
      { key: 'District Type' },
      { key: 'Acres', label: 'Total Acres' },
      { key: 'hex_color', visible: false },
    ],
  },
  {
    id: 'zoning_allowance',
    title: 'Zoning Allowance by Unit Type',
    categories: ['Land Use'],
    xField: 'use_type',
    yField: 'Acres',
    subtype: 'ZoningAllowanceStackedBarChart',
    chartParams: {
      legendLabels: ['Allowed', 'Conditional', 'Not Allowed', 'Public Hearing'],
      color: 'hex_color'
    },
    url: `${BASE_API_URL}/load/data/zoning/allowances`,
    filterKey: '',
    notes: 'Acreage distribution by family allowance (Residential + Mixed use).',
    showCols: [
      { key: 'use_type', label: 'Residential Type' },
      { key: 'val', label: 'Zoning Outcome' },
      { key: 'Acres', label: 'Total Acres' },
    ],
  },
  // tenure bar chart removed — not adding enough information (4.3)
  // {
  //   id: 'tenure',
  //   title: 'Housing Tenure',
  //   categories: ['Housing'],
  //   xField: 'Occupied Tenure',
  //   yField: 'Value',
  //   subtype: 'CompareDiffPerXBarChart',
  //   chartParams: { colorScheme: 'schemeAccent', legendLabels: ['Main', 'Compare'] },
  //   dataKey: 'plot_data.tenure_df',
  //   url: `${BASE_API_URL}/load/census/housing/snapshot`,
  // },
  {
    id: 'demographics',
    title: 'Changes in Age Composition',
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
  // Education (Bar Graph)
  {
    id: 'age_distribution',
    title: 'Age Distribution',
    categories: ['Demographics'],
    xField: 'Variable',
    yField: 'Percent',
    subtype: 'CompareDiffPerXBarChart',
    chartParams: { 
      legendLabels: ['Main', 'Compare'],
      fixedYear: 2024, // NOTE: Temporary fix to ensure chart shows most recent year (2024).
      percentFormat: true,
      includeCategories: [
        "Under 18",
        "18 to 24",
        "25 to 34",
        "35 to 44",
        "45 to 54",
        "55 to 64",
        "65 to 74",
        "75 plus",
      ]
    },
    url: `${BASE_API_URL}/load/acs5-db/tidy/demographics`,
    filterKey: '',
    showCols: [
      { key: 'NAME' },
      { key: 'Variable' },
      { key: 'Percent' },
    ],
  },
  {
    id: 'demographics_population',
    title: 'Historic Population Estimates',
    url: `${BASE_API_URL}/load/census/demographic/historic_population`,
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
    id: 'demographics_estimates',
    title: 'Demographics Summary Table',
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
    url: `${BASE_API_URL}/load/acs5-db/tidy/demographics/median-age`,
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
  {
    id: 'education_trend',
    title: 'Educational Attainment – Trend',
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
    categories: ['Education'],
    xField: 'Variable',
    yField: 'Percent',
    subtype: 'CompareDiffPerXBarChart',
    chartParams: { 
      legendLabels: ['Main', 'Compare'],
      fixedYear: 2024, // NOTE: Temporary fix to ensure chart shows most recent year (2024).
      percentFormat: true
    },
    url: `${BASE_API_URL}/load/acs5-db/tidy/education`,
    filterKey: '',
    showCols: [
      { key: 'NAME' },
      { key: 'Variable' },
      { key: 'Percent' },
    ],
  },
  // Housing
  {
    id: 'home_value',
    title: 'Median Home Value',
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
  // Labor Force
  {
    id: 'labor_force_trend_16plus',
    title: 'Labor Force Participation (Ages 16+)',
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
    url: `${BASE_API_URL}/load/acs5-db/tidy/unemployment-rate`,
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
    title: 'Median Earnings - Value',
    url: `${BASE_API_URL}/load/acs5-db/tidy/median-earnings`,
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
    title: 'Total Employment — Four-Quarter Moving Average',
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
    url: `${BASE_API_URL}/load/acs5-db/tidy/income`,
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
    url: `${BASE_API_URL}/load/acs5-db/tidy/income`,
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
