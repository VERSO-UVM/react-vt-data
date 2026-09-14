/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Orchestrates the @react-pdf/renderer PDF generation flow.
 *
 * Steps:
 *  1. Capture chart images from the already-rendered (PDF-mode) DOM
 *  2. Build the ReportDocument component with captured images + raw table data
 *  3. Render to a Blob and trigger browser download
 */

import { toPng } from 'html-to-image';
import { createElement } from 'react';
import { PdfSection } from './types';

/**
 * Capture a DOM element as a PNG data URL.
 *
 * Uses html-to-image (SVG foreignObject + the browser's own rasterizer)
 * rather than html2canvas, which reimplements CSS painting in JS and took
 * 9-13 SECONDS per chart here — a full report was minutes long. This path
 * captures the whole subtree, so Recharts' HTML legends come along with the
 * chart SVG.
 *
 * skipFonts avoids the webfont-inlining step, which refetches and re-parses
 * every stylesheet per capture; charts use plain sans-serif stacks that
 * resolve fine without it.
 */
async function captureElement(el: HTMLElement): Promise<string> {
  return toPng(el, {
    // The PDF renders these at ~515x200pt, and a chart box is ~1100px wide,
    // so 1x is already ~2x the printed resolution. Going higher just makes
    // react-pdf spend seconds embedding pixels nobody can see.
    pixelRatio: 1,
    backgroundColor: '#ffffff',
    skipFonts: true,
    cacheBust: false,
  });
}

/**
 * Main entry point. Call this after the working-report DOM has been set to
 * PDF mode (so SVG charts are rendered and scroll containers are unclipped).
 *
 * @param sections   Ordered sections/items exactly as arranged on screen
 * @param container  The div wrapping the rendered chart cards
 * @param location   Location name shown on the title page (e.g. "Bristol")
 */
export async function generateReportPdf(
  sections: PdfSection[],
  container: HTMLElement,
  location?: string,
): Promise<void> {
  // -------------------------------------------------------------------------
  // 1. Capture raster images for every entry in 'image' mode
  // -------------------------------------------------------------------------
  const chartImages: Record<string, string> = {};

  const targets = sections
    .flatMap(({ items }) => items)
    .filter(
      (entry) => entry.mode === 'image' && entry.chart.subtype !== 'noteCard',
    )
    .map((entry) => {
      // Each ChartCard root element has data-chart-id set by ChartCard, keyed
      // by the stable defId (not chart.id — see PdfChartEntry's doc comment).
      const cardEl = container.querySelector<HTMLElement>(
        `[data-chart-id="${entry.defId}"]`,
      );
      // The inner chart box (whatever view is currently active) has
      // data-chart-box
      const targetEl =
        cardEl?.querySelector<HTMLElement>('[data-chart-box]') ?? cardEl;
      return { defId: entry.defId, targetEl };
    })
    .filter((t): t is { defId: string; targetEl: HTMLElement } => !!t.targetEl);

  // Captures run concurrently — each one is mostly waiting on the browser to
  // decode and rasterize an image, so they overlap well.
  await Promise.all(
    targets.map(async ({ defId, targetEl }) => {
      try {
        chartImages[defId] = await captureElement(targetEl);
      } catch (err) {
        console.warn(`[pdfReport] Failed to capture chart ${defId}:`, err);
      }
    }),
  );

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
    sections,
    chartImages,
    generatedAt,
    location,
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
