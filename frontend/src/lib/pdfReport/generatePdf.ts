/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Orchestrates the @react-pdf/renderer PDF generation flow.
 *
 * Steps:
 *  1. Capture chart images from the already-rendered (PDF-mode) DOM
 *  2. Build the ReportDocument component with captured images + raw table data
 *  3. Render to a Blob and trigger browser download
 *
 * html2canvas is a transitive dependency of html2pdf.js (v1.4.1). We import
 * it here directly since it is available in node_modules.
 */

import html2canvas from 'html2canvas';
import { createElement } from 'react';
import { ChartItem } from '@/types/cachedCharts';

/** Capture a DOM element as a PNG data URL using html2canvas. */
async function captureElement(el: HTMLElement): Promise<string> {
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    // Suppress logging in production
    logging: false,
  });
  return canvas.toDataURL('image/png');
}

/**
 * Main entry point. Call this after the working-report DOM has been set to
 * PDF mode (so SVG charts are rendered and scroll containers are unclipped).
 *
 * @param charts     The ChartItem[] from the Zustand store
 * @param container  The div wrapping the rendered ChartStack
 */
export async function generateReportPdf(
  charts: ChartItem<any>[],
  container: HTMLElement,
): Promise<void> {
  // -------------------------------------------------------------------------
  // 1. Capture raster images for non-table charts
  // -------------------------------------------------------------------------
  const chartImages: Record<string, string> = {};

  for (const chart of charts) {
    if (chart.subtype.startsWith('renderTable')) continue;
    if (chart.subtype === 'noteCard') continue;

    // Each ChartCard root element has data-chart-id set by ChartCard
    const cardEl = container.querySelector<HTMLElement>(
      `[data-chart-id="${chart.id}"]`,
    );
    if (!cardEl) continue;

    // The inner chart box (height:400 in normal mode) has data-chart-box
    const chartBox = cardEl.querySelector<HTMLElement>('[data-chart-box]');
    const targetEl = chartBox ?? cardEl;

    try {
      chartImages[chart.id] = await captureElement(targetEl);
    } catch (err) {
      console.warn(`[pdfReport] Failed to capture chart ${chart.id}:`, err);
    }
  }

  // -------------------------------------------------------------------------
  // 2. Build the @react-pdf/renderer document (dynamic import for SSR safety)
  // -------------------------------------------------------------------------
  const { pdf } = await import('@react-pdf/renderer');
  const { ReportDocument } = await import('./ReportDocument');

  const generatedAt = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const doc = createElement(ReportDocument, {
    charts,
    chartImages,
    generatedAt,
  });

  // -------------------------------------------------------------------------
  // 3. Render to Blob and download
  // -------------------------------------------------------------------------
  // pdf() is typed to expect ReactElement<DocumentProps> (a <Document> element
  // directly), but our wrapper component is also valid input — cast to any.
  const blob = await pdf(doc as any).toBlob();
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'working-report.pdf';
  anchor.click();

  // Small delay before revoking so the browser has time to initiate download
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
