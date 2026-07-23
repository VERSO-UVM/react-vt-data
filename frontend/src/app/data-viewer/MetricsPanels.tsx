import { FONT_DISPLAY, COLOR } from './theme';
import { FieldLabel } from './FieldLabel';

import { Grid, Text } from '@mantine/core';

const METRICS: { label: string; field: string; prefix?: string }[] = [
  { label: 'Population', field: 'Population (ACS)' },
  {
    label: 'Household Income',
    field: 'Median Household Income',
    prefix: '$',
  },
  { label: 'Median Age', field: 'Median Age' },
  {
    label: 'In Labor Force (16+)',
    field: 'Labor Force Participation Rate (16+)',
  },
  { label: 'Median Home Value', field: 'Median Home Value', prefix: '$' },
];

const metricValueStyle = {
  fontFamily: FONT_DISPLAY,
  fontSize: '1.9rem',
  fontWeight: 600,
  lineHeight: 1,
  color: COLOR.birch,
  marginBottom: 8,
};

const formatNumber = (v?: number) =>
  v === undefined || v === null ? '—' : v.toLocaleString();

export function MetricsPanel({ metrics }: { metrics: Record<string, number> }) {
  return (
    <Grid>
      {METRICS.map(({ label, field, prefix }) => (
        <Grid.Col key={field} span={{ base: 6, md: 2.4 }}>
          <Text style={metricValueStyle}>
            {prefix}
            {formatNumber(metrics[field])}
          </Text>
          <FieldLabel>{label}</FieldLabel>
        </Grid.Col>
      ))}
    </Grid>
  );
}
