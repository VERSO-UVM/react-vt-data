// chartDefs.ts\
import { BASE_API_URL } from '@/config';

export interface ChartDef {
  id: string;
  title: string;
  xField: string;
  yField: string;
  subtype: string;
  chartParams?: any;
  url: string;
  filterkey?: string;
}

export const chartDefs: ChartDef[] = [
  {
    id: 'acreage',
    title: 'Acreage Chart',
    xField: 'District Type',
    yField: 'Acres',
    subtype: 'CompareDiffPerXBarChart',
    chartParams: { color: 'hex_color', legendLabels: ['Main', 'Compare'] },
    url: `${BASE_API_URL}/post/load/mapping/zoning`,
    filterkey: 'aggregated_acres',
  },
];

// units_in_structure_bar_chart = bar_chart(
//   plot_dfs['units_in_structure_df'],
//   title_geo=title_geo,
//   x_col="Structure Category",
//   y_col="Units",
//   distribution=True,
//   height=600,
//   fill="tomato",
//   title="2023 Housing Unit Type Distribution",
//   bar_width=90,
//   x_label_angle=0,
//   x_label_size=12
// )
