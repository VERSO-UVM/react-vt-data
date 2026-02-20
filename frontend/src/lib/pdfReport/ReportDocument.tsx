/* eslint-disable @typescript-eslint/no-explicit-any, jsx-a11y/alt-text */
/**
 * @react-pdf/renderer document for the working report.
 *
 * Tables are rendered as proper PDF text (selectable). Charts are embedded
 * as raster PNG images captured from the DOM before this document is built.
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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const s = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 40,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#222',
  },
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
  card: {
    marginBottom: 16,
    breakInside: 'avoid',
  },
  cardTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 9,
    color: '#555',
    marginBottom: 6,
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
  divider: {
    borderBottomWidth: 0.5,
    borderColor: '#e0e0e0',
    marginVertical: 12,
  },
  noteCard: {
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 3,
    borderLeftWidth: 2,
    borderColor: '#ccc',
    marginBottom: 12,
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
// Single chart card
// ---------------------------------------------------------------------------

const PdfCard = ({
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
      <View style={s.noteCard}>
        <Text style={s.noteText}>{chart.notes ?? ''}</Text>
      </View>
    );
  }

  return (
    <View style={s.card}>
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
// Root document
// ---------------------------------------------------------------------------

export interface ReportDocumentProps {
  charts: ChartItem<any>[];
  chartImages: Record<string, string>; // chart.id → PNG data URL
  reportTitle?: string;
  generatedAt?: string;
}

export const ReportDocument = ({
  charts,
  chartImages,
  reportTitle = 'Vermont Data Report',
  generatedAt,
}: ReportDocumentProps) => (
  <Document title={reportTitle} author="Vermont Data Explorer">
    <Page size="A4" style={s.page}>
      {/* Page header */}
      <View style={s.pageHeader} fixed>
        <Text>{reportTitle}</Text>
        <Text>{generatedAt ?? ''}</Text>
      </View>

      {/* Cards */}
      {charts.map((chart) => (
        <PdfCard
          key={chart.id}
          chart={chart}
          imageUrl={chartImages[chart.id]}
        />
      ))}

      {/* Page footer */}
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
