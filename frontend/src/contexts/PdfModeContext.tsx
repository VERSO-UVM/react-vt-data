import { createContext, useContext } from 'react';

/**
 * When true, chart components should render in PDF-safe mode:
 *   - Chart.js canvas components switch to Recharts SVG equivalents
 *   - ChartCard removes the fixed-height container constraint
 *
 * The working-report page is the only provider. All other pages leave this
 * as false (the default), so interactive behaviour is unaffected.
 */
export const PdfModeContext = createContext<boolean>(false);

export const usePdfMode = () => useContext(PdfModeContext);
