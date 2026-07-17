'use client';
import { Paper, Divider, Text } from '@mantine/core';
import type { FeatureCollection } from 'geojson';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';

type Legend = {
  measures: [string, string];
};

type Point = {
  x: number;
  y: number;
  fill: string;
  tooltip: Record<string, unknown>;
};

const rgba = (c: number[]) => `rgba(${c[0]},${c[1]},${c[2]},${c[3] / 255})`;

/** Same card as the map hover tooltip, driven by `properties.tooltip`. */
function PointTooltip({ content }: { content: Record<string, unknown> }) {
  return (
    <Paper shadow="md" p="xs" style={{ maxWidth: 280 }}>
      <strong>{String(content.__title__)}</strong>
      <Divider my={4} />
      {Object.entries(content).map(
        ([k, v]) =>
          k !== '__title__' && (
            <div key={k} style={{ fontSize: 12 }}>
              <b>{k}:</b> {String(v)}
            </div>
          ),
      )}
    </Paper>
  );
}

/**
 * Scatter of the two compared measures — x is measure[0], y is measure[1].
 * Each point inherits the region's exact map color, so the scatter and the map
 * read as one encoding. Uses the same tooltip as the map.
 */
export default function VariableScatter({
  geojson,
  legend,
}: {
  geojson: FeatureCollection | null;
  legend: Legend | null;
}) {
  if (!geojson || !legend) return null;

  const [mx, my] = legend.measures;
  const points: Point[] = geojson.features
    .map((f) => {
      const t = (f.properties?.tooltip ?? {}) as Record<string, unknown>;
      const color = f.properties?.rgba_color as number[] | undefined;
      return {
        x: Number(t[mx]),
        y: Number(t[my]),
        fill: color ? rgba(color) : '#888',
        tooltip: t,
      };
    })
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

  if (points.length === 0) return null;

  return (
    <Paper withBorder p="md" radius="md">
      <Text size="sm" fw={500} mb="sm">
        {my} vs. {mx}
      </Text>
      <ResponsiveContainer width="100%" height={360}>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 32, left: 8 }}>
          <CartesianGrid stroke="var(--mantine-color-gray-2)" />
          <XAxis
            type="number"
            dataKey="x"
            name={mx}
            tick={{ fontSize: 11 }}
            label={{ value: mx, position: 'bottom', fontSize: 12 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={my}
            tick={{ fontSize: 11 }}
            label={{
              value: my,
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fontSize: 12 },
            }}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) =>
              active && payload && payload.length ? (
                <PointTooltip content={(payload[0].payload as Point).tooltip} />
              ) : null
            }
          />
          <Scatter data={points}>
            {points.map((p, i) => (
              <Cell
                key={i}
                fill={p.fill}
                stroke="var(--mantine-color-body)"
                strokeWidth={1}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </Paper>
  );
}
