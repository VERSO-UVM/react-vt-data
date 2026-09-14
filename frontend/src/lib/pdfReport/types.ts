/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChartItem } from '@/types/cachedCharts';

/**
 * One chart/table entry, already resolved to exactly what the working-report
 * page is showing on screen for it — the PDF is a mirror of this, not an
 * independent re-derivation.
 *
 *  - mode 'image': captured as a screenshot of the rendered DOM
 *    (data-chart-box), whatever it currently shows — chart or table view.
 *    Used for everything except items with no possible chart view.
 *  - mode 'native-table': rendered as native PDF text via PdfTableSection.
 *    Used only for items with no trend-chart companion at all (the view
 *    switch is hidden for these on screen too — there's nothing to toggle).
 *
 * defId is the stable identifier to look the entry's DOM node up by —
 * chart.id is a fresh UUID generated on every render (auto-populated items
 * are rebuilt from live data each time), so it can't be trusted to still
 * match the DOM by the time capture runs (WorkingReport re-renders, and
 * regenerates every chart.id, as soon as PDF mode is switched on).
 */
export interface PdfChartEntry {
  chart: ChartItem<any>;
  defId: string;
  mode: 'image' | 'native-table';
  title: string;
  notes?: string;
}

export interface PdfSection {
  category: string;
  items: PdfChartEntry[];
}
