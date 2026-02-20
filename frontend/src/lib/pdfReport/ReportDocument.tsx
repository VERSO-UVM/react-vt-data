/* eslint-disable @typescript-eslint/no-explicit-any, jsx-a11y/alt-text */
/**
 * @react-pdf/renderer document for the working report.
 *
 * Tables are rendered as proper PDF text (selectable). Charts are embedded
 * as raster PNG images captured from the DOM before this document is built.
 *
 * Section order is driven by INTEREST_OPTIONS in profileStore — one source
 * of truth for the category list.
 */

import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';
import { ChartItem } from '@/types/cachedCharts';
import { INTEREST_OPTIONS } from '@/components/profile/profileStore';

// ---------------------------------------------------------------------------
// Section grouping (order follows INTEREST_OPTIONS)
// ---------------------------------------------------------------------------

function groupByCategory(
  charts: ChartItem<any>[],
): { category: string; items: ChartItem<any>[] }[] {
  const groupMap = new Map<string, ChartItem<any>[]>();
  for (const chart of charts) {
    const cat = chart.categories?.[0] ?? 'Other';
    if (!groupMap.has(cat)) groupMap.set(cat, []);
    groupMap.get(cat)!.push(chart);
  }

  const ordered: { category: string; items: ChartItem<any>[] }[] = [];
  for (const cat of INTEREST_OPTIONS) {
    if (groupMap.has(cat)) {
      ordered.push({ category: cat, items: groupMap.get(cat)! });
      groupMap.delete(cat);
    }
  }
  // Remaining categories (e.g. 'Other', any future additions) come last
  for (const [cat, items] of groupMap) {
    ordered.push({ category: cat, items });
  }
  return ordered;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  // Content page
  page: {
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 40,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#222',
  },
  // Title page
  titlePage: {
    fontFamily: 'Helvetica',
    color: '#222',
    paddingHorizontal: 60,
    paddingVertical: 80,
    flexDirection: 'column',
    alignItems: 'center',
  },
  titlePageInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titlePageLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 20,
    textAlign: 'center',
  },
  titlePageLocation: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  titlePageSubtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 48,
    textAlign: 'center',
  },
  titlePageDivider: {
    width: 60,
    borderBottomWidth: 1,
    borderColor: '#bbb',
    marginBottom: 40,
  },
  titlePageDate: {
    fontSize: 10,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  titlePageSource: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
  },
  // Page header / footer
  pageHeader: {
    fontSize: 8,
    color: '#888',
    marginBottom: 20,
    borderBottomWidth: 0.5,
    borderColor: '#ccc',
    paddingBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pageFooter: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 7,
    color: '#aaa',
    textAlign: 'center',
  },
  // Section header
  sectionHeader: {
    marginTop: 4,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1.5,
    borderColor: '#999',
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#333',
  },
  // Binds a section header to the card that follows it so the header
  // never strands alone at the bottom of a page.
  sectionHeaderAndFirstCard: {
    breakInside: 'avoid',
  },
  // Cards
  card: {
    marginBottom: 16,
    breakInside: 'avoid',
  },
  cardTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  source: {
    fontSize: 7,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  chartImage: {
    width: '100%',
    height: 200,
    objectFit: 'contain',
  },
  // Table
  tableContainer: {
    marginTop: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: '#ddd',
    paddingVertical: 2,
    alignItems: 'center',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#666',
    paddingVertical: 3,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
  },
  labelCell: {
    width: 120,
    fontSize: 7,
    paddingHorizontal: 3,
    fontFamily: 'Helvetica',
  },
  labelHeaderCell: {
    width: 120,
    fontSize: 7,
    paddingHorizontal: 3,
    fontFamily: 'Helvetica-Bold',
  },
  yearCell: {
    flex: 1,
    fontSize: 7,
    paddingHorizontal: 2,
    textAlign: 'right',
  },
  yearHeaderCell: {
    flex: 1,
    fontSize: 7,
    paddingHorizontal: 2,
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
  },
  noData: {
    fontSize: 8,
    color: '#888',
    marginTop: 8,
  },
  noteCard: {
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 3,
    borderLeftWidth: 2,
    borderColor: '#ccc',
    marginBottom: 12,
    breakInside: 'avoid',
  },
  noteText: {
    fontSize: 8,
    color: '#555',
  },
});

// ---------------------------------------------------------------------------
// Table renderer
// ---------------------------------------------------------------------------

type RenderCellFn = (row: any) => string;

const renderTablePercent: RenderCellFn = (row) =>
  row?.Percent != null ? `${row.Percent.toFixed(1)}%` : '—';

const renderTableValue: RenderCellFn = (row) =>
  row?.Value != null ? Number(row.Value).toLocaleString() : '—';

const renderTableMixed: RenderCellFn = (row) => {
  if (row?.Percent != null) return `${row.Percent.toFixed(1)}%`;
  if (row?.Value != null) return Number(row.Value).toLocaleString();
  return '—';
};

function getCellRenderer(subtype: string): RenderCellFn {
  if (subtype === 'renderTable') return renderTablePercent;
  if (subtype === 'renderTableMixed') return renderTableMixed;
  return renderTableValue; // renderTableEstimates and anything else
}

const PdfTableSection = ({ chart }: { chart: ChartItem<any> }) => {
  const data = (chart.data ?? []) as any[];
  if (data.length === 0) {
    return <Text style={s.noData}>No data available.</Text>;
  }

  const years = Array.from(new Set(data.map((r) => r.year))).sort() as number[];
  const variables = Array.from(new Set(data.map((r) => r.Variable))) as string[];
  const renderCell = getCellRenderer(chart.subtype);

  const findRow = (variable: string, year: number) =>
    data.find((r) => r.Variable === variable && r.year === year);

  return (
    <View style={s.tableContainer}>
      {/* Header */}
      <View style={s.tableHeaderRow}>
        <Text style={s.labelHeaderCell}>Variable</Text>
        {years.map((y) => (
          <Text key={y} style={s.yearHeaderCell}>
            {y}
          </Text>
        ))}
      </View>

      {/* Rows */}
      {variables.map((variable, idx) => (
        <View
          key={variable}
          style={[
            s.tableRow,
            idx % 2 === 0 ? { backgroundColor: '#fafafa' } : {},
          ]}
        >
          <Text style={s.labelCell}>{variable}</Text>
          {years.map((year) => {
            const row = findRow(variable, year);
            return (
              <Text key={year} style={s.yearCell}>
                {renderCell(row)}
              </Text>
            );
          })}
        </View>
      ))}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Single chart card (inner content — page-break wrapping handled by callers)
// ---------------------------------------------------------------------------

const PdfCardContent = ({
  chart,
  imageUrl,
}: {
  chart: ChartItem<any>;
  imageUrl?: string;
}) => {
  const isTable = chart.subtype.startsWith('renderTable');
  const title = [chart.description, chart.title].filter(Boolean).join(' for ');

  if (chart.subtype === 'noteCard') {
    return (
      <View style={s.noteCard} wrap={false}>
        <Text style={s.noteText}>{chart.notes ?? ''}</Text>
      </View>
    );
  }

  // Tables may exceed a page so they must remain wrappable (wrap=true/default).
  // Charts have a fixed ~200px image height — force them onto a single page
  // fragment with wrap={false} so the title never strands above the image.
  return (
    <View style={s.card} wrap={isTable}>
      <Text style={s.cardTitle}>{title}</Text>

      {isTable ? (
        <PdfTableSection chart={chart} />
      ) : imageUrl ? (
        <Image src={imageUrl} style={s.chartImage} />
      ) : (
        <Text style={s.noData}>[Chart image not captured]</Text>
      )}

      {chart.metadata?.source && (
        <Text style={s.source}>{chart.metadata.source}</Text>
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Title page
// ---------------------------------------------------------------------------

const TitlePage = ({
  location,
  generatedAt,
}: {
  location?: string;
  generatedAt: string;
}) => (
  <Page size="A4" style={s.titlePage}>
    <View style={s.titlePageInner}>
      <Text style={s.titlePageLabel}>Vermont Data Report</Text>
      {location && <Text style={s.titlePageLocation}>{location}</Text>}
      <Text style={s.titlePageSubtitle}>Data Profile</Text>
      <View style={s.titlePageDivider} />
      <Text style={s.titlePageDate}>{generatedAt}</Text>
      <Text style={s.titlePageSource}>Vermont Data Collaborative</Text>
    </View>
  </Page>
);

// ---------------------------------------------------------------------------
// Root document
// ---------------------------------------------------------------------------

export interface ReportDocumentProps {
  charts: ChartItem<any>[];
  chartImages: Record<string, string>; // chart.id → PNG data URL
  reportTitle?: string;
  location?: string;
  generatedAt?: string;
}

export const ReportDocument = ({
  charts,
  chartImages,
  reportTitle = 'Vermont Data Report',
  location,
  generatedAt = '',
}: ReportDocumentProps) => {
  const sections = groupByCategory(charts);
  const headerLabel = location ? `${reportTitle} — ${location}` : reportTitle;

  return (
    <Document title={reportTitle} author="Vermont Data Explorer">
      {/* Title page */}
      <TitlePage location={location} generatedAt={generatedAt} />

      {/* Content pages */}
      <Page size="A4" style={s.page}>
        {/* Running page header */}
        <View style={s.pageHeader} fixed>
          <Text>{headerLabel}</Text>
          <Text>{generatedAt}</Text>
        </View>

        {sections.map(({ category, items }) => (
          <View key={category}>
            {/*
             * Wrap section header + first card together so the header never
             * orphans at the bottom of a page.
             */}
            <View
              style={s.sectionHeaderAndFirstCard}
              wrap={items[0]?.subtype.startsWith('renderTable')}
            >
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>{category}</Text>
              </View>
              {items[0] && (
                <PdfCardContent
                  chart={items[0]}
                  imageUrl={chartImages[items[0].id]}
                />
              )}
            </View>

            {/* Remaining cards in this section */}
            {items.slice(1).map((chart) => (
              <PdfCardContent
                key={chart.id}
                chart={chart}
                imageUrl={chartImages[chart.id]}
              />
            ))}
          </View>
        ))}

        {/* Running page footer */}
        <Text
          style={s.pageFooter}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
};
