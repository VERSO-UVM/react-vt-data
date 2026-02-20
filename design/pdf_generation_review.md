# PDF Generation Review

*Assessment of the current system and whether a separate renderer is needed.*

---

## How the Current System Works

### Save path

Users add charts from the data-viewer to the **ItemsProvider** Zustand store, which is
persisted to localStorage under key `'items-storage'`. Each saved `ChartItem` is a full data
snapshot — it contains `data[]`, `compareData[]`, `tableData[]`, `chartParams`, `metadata`, and
rendering hints. There is no live reference back to the API; data is frozen at save time.

### Render path

`/working-report` renders all saved `ChartItem`s via the same `ChartStack` / `ChartCard`
components used in the data-viewer, but with `action="remove"` (no view toggle, no live
refetch). The page is a straightforward DOM render of the saved charts.

### Export path

A single "Download PDF" button calls:

```typescript
html2pdf()
  .set({
    margin: 10,
    filename: 'working-report.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  })
  .from(componentRef.current)
  .save();
```

`html2pdf.js` runs `html2canvas` to rasterize the DOM subtree, then passes the resulting image
to `jsPDF` to produce a PDF. The entire working-report div becomes one or more A4-sized JPEG
images embedded in a PDF shell.

---

## Chart Rendering Breakdown

`ChartStack` dispatches on `chart.subtype`. The rendering technology matters for PDF quality:

| Component | Library | Render target | PDF quality |
|---|---|---|---|
| `DualLine`, `DemographicsTrendChart`, `EducationTrendChart`, `HousingTrendChart`, `DPTrendChart` | Recharts | SVG | Good — SVG rasterized at 2× scale |
| `SamePerXBarChart` | Recharts | SVG | Good |
| `DiffPerXBarChart`, `CompareDiffPerXBarChart`, `CompareHBarChart` | Chart.js | `<canvas>` | Acceptable — canvas captured as bitmap |
| `EmploymentAreaChart` | Recharts (chart views) + Mantine Table (table view) | SVG / HTML | Good for chart view; table view may clip |
| `DemographicsTable`, `renderTableEstimates`, `renderTableMixed` | Mantine `<Table>` inside `<ScrollArea>` | HTML | **High risk** — see below |
| `noteCard` | Plain text | HTML | Fine |

---

## Current Limitations

### High severity

**Table ScrollArea clipping.** Tables are wrapped in `<ScrollArea style={{ height: 400 }}>`.
`html2canvas` captures only the visible 400 px of the scroll container. Rows below the fold are
silently omitted from the PDF. For the demographics table with many variables, this can cut the
table in half.

**No page-break control.** `html2pdf.js` tiles content across A4 pages mechanically — it does
not understand chart or table boundaries. A chart or table may be split across two pages at an
arbitrary pixel offset, producing unreadable output.

**Multi-page layout is a single image.** The PDF produced is not a structured document; it is a
sequence of full-page JPEG images. There are no text layers (not selectable/searchable), no
accessibility structure, no hyperlinks, and no metadata.

### Medium severity

**Fixed container heights.** `ChartCard` sets `{ height: 400, overflow: 'auto' }` on every
chart. This is a good screen size but not necessarily the right proportion for A4 paper (about
190 mm × 120 mm at typical margins). Charts with many data points or legends may look cramped.

**Canvas chart rasterization.** Chart.js components render to `<canvas>`. `html2canvas` captures
them as bitmaps at 2× device pixel ratio. At high zoom in the PDF viewer or when printed, these
charts are noticeably blurry relative to Recharts SVGs.

**No print CSS.** There are no `@media print` rules. Mantine component colors, shadows, and
borders are designed for screen rendering and may not translate well to print. Navigation
elements or UI chrome that happen to be in the DOM subtree could appear in the PDF.

**Comparison toggle state not persisted.** `DemographicsTable` has a "Show/Hide Comparison"
toggle whose state lives in local component state. When the working-report page re-renders the
saved `ChartItem`, the toggle resets to its default position. The PDF captures whatever default
is shown, not what the user had toggled when they saved the chart.

### Low severity

**Performance on large reports.** `html2canvas` redraws every element in the DOM subtree
synchronously. Reports with 10+ charts will be slow (5–15 seconds) and may cause the browser
tab to become unresponsive during generation.

---

## Is the Current System Adequately Extensible?

**For the current use case (internal prototype, small reports, ≤5 charts):** Yes. The system
works and requires no changes.

**For the stated goal of replicating the Addison County Annual Report:** No. The Annual Report
has:
- Section headers, numbered pages, headers/footers
- Charts sized and placed deliberately within page columns
- Tables that fit within a page (not truncated by scroll containers)
- Consistent typography and branding
- Selectable text

None of these are achievable by rasterizing the current working-report DOM. The existing
approach also does not compose well — adding features like page breaks, column layouts, or
running headers requires restructuring the working-report page itself around PDF constraints,
which conflicts with its role as a screen-readable interactive page.

---

## Recommendations

### Near-term: patch the worst issues without a new renderer

These changes do not require a new library and significantly reduce the worst failures:

1. **Unclip scroll areas for PDF.** Add a CSS class (e.g., `.pdf-mode`) applied to the
   working-report wrapper when "Download PDF" is clicked. A `@media print` or `.pdf-mode`
   rule sets `height: auto; overflow: visible` on all `ScrollArea` and chart container elements.
   Remove the class after `html2pdf` finishes. This fixes table clipping at zero library cost.

2. **Add page-break hints.** Add `page-break-inside: avoid; break-inside: avoid` on each
   `ChartCard` wrapper. `html2pdf.js` respects these CSS properties. This will not produce
   perfect breaks but eliminates the worst mid-chart splits.

3. **Use SVG-only charts in the working report.** For bar charts currently rendered with
   Chart.js, consider adding Recharts equivalents for the working-report context. Or pass a
   `chartParams.pdfMode = true` flag that chart components use to switch to an SVG renderer.

These three changes can be made incrementally and are low-risk.

### Long-term: a dedicated PDF renderer

When the project moves toward production Annual Report–quality output, a dedicated renderer
is appropriate. Two realistic options:

**Option A — React PDF (`@react-pdf/renderer`)**

Renders a React component tree directly to a PDF binary using pdfkit — no DOM capture, no
canvas rasterization. Charts would need to be re-implemented as SVG elements (Recharts outputs
valid SVG that can be embedded). Tables render as PDF vector text.

- Pro: Full layout control (columns, page breaks, headers, footers, fonts).
- Pro: Produces a proper structured PDF with selectable text.
- Con: Each chart component needs a PDF-specific mirror. This is significant but manageable
  given the existing `ChartItem` data structure (data is already self-contained).
- Con: Chart.js canvas charts have no direct React PDF equivalent — they would need to be
  replaced with SVG charts for the PDF path.

**Option B — Server-side Puppeteer / Playwright**

Render a dedicated `/pdf-report` route server-side (Next.js SSR or a separate Node service)
and print it to PDF via headless Chromium. The PDF route can have its own layout, CSS media
queries, and page-break logic, while the interactive working-report page remains unchanged.

- Pro: Can use the full existing component library; no chart re-implementation needed.
- Pro: Produces a structured PDF (Chromium's print-to-PDF is much higher quality than
  html2canvas).
- Con: Requires a server-side render step, adding latency and infrastructure complexity. The
  saved ChartItem data (currently in localStorage) would need to be passed to the server (e.g.,
  posted to a `/api/pdf` endpoint).

**Recommendation:** Implement the three near-term patches now. When the Annual Report feature is
scoped for production, adopt Option A (React PDF) — the `ChartItem` data structure is already
well-suited to it, and the project's stated goal is a document that matches the Word Report
design, which requires explicit layout control that DOM-capture cannot provide.
