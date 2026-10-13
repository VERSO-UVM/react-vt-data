'use client';

/**
 * One agent chart in the conversation. The spec carries only a data reference,
 * so the rows are fetched here (and again whenever a saved chat reloads).
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Anchor,
  Box,
  Button,
  Card,
  Group,
  Loader,
  Stack,
  Text,
} from '@mantine/core';
import { CheckIcon, PlusIcon } from '@phosphor-icons/react';
import { AgentChart } from '@/components/Charts/AgentChart';
import { useItems } from '@/components/ItemsProvider';
import type { ChartItem, DataRow } from '@/types/cachedCharts';
import { fetchChartData, type ChartData, type ChartSpec } from './api';

/** A stable id, so the same chart isn't added to the report twice. */
function chartId(spec: ChartSpec) {
  const text = JSON.stringify([
    spec.kind,
    spec.data,
    spec.x,
    spec.y,
    spec.series,
    spec.columns,
  ]);
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return `chat-${(hash >>> 0).toString(36)}`;
}

function toChartItem(spec: ChartSpec, data: ChartData): ChartItem<DataRow> {
  const source = data.provenance?.source_name;
  return {
    id: chartId(spec),
    // Cards show title beside description; other report charts use the
    // place as the title, so name the origin here instead.
    title: 'Data Chat',
    description: spec.title,
    type: 'chart',
    subtype: spec.kind === 'table' ? 'renderTableAgent' : 'AgentChart',
    createdAt: new Date().toISOString(),
    categories: ['Data Chat'],
    xField: spec.x ?? '',
    yField: spec.y ?? '',
    data: data.rows,
    dataRef: {
      datasetId: String(spec.data.args.dataset_id ?? ''),
      params: {
        tool: spec.data.tool,
        args: spec.data.args,
      },
    },
    notes: spec.note ?? undefined,
    metadata: typeof source === 'string' ? { source } : undefined,
    chartParams: {
      kind: spec.kind,
      series: spec.series ?? null,
      columns: spec.columns ?? null,
      yUnit: spec.y_label ?? (spec.y ? data.units?.[spec.y] : null) ?? null,
    },
  };
}

export function ChatChart({ spec }: { spec: ChartSpec }) {
  const [data, setData] = useState<ChartData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chartNotes, setChartNotes] = useState<string[]>([]);
  const { items, addItem, removeItem } = useItems();

  useEffect(() => {
    let cancelled = false;
    fetchChartData(spec.data)
      .then((d) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [spec.data]);

  const item = useMemo(
    () => (data ? toChartItem(spec, data) : null),
    [spec, data],
  );
  const inReport = item ? items.some((i) => i.id === item.id) : false;
  const source = data?.provenance;
  // Every caveat on one quiet line under the chart: the agent's note, the
  // chart's own notes (gaps, clipped series), truncation, then the source.
  const footer = [
    spec.note,
    ...chartNotes,
    data?.truncated
      ? `Showing the first ${data.rows.length.toLocaleString()} rows.`
      : null,
  ].filter(Boolean);
  const sourceName =
    typeof source?.source_name === 'string' ? source.source_name : null;

  return (
    <Card withBorder radius="lg" padding="lg" bg="white">
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start" gap="sm">
          <Text fw={600} style={{ flex: 1, minWidth: 0 }}>
            {spec.title}
          </Text>
          {item && (
            <Button
              size="compact-sm"
              variant="default"
              color="gray"
              leftSection={
                inReport ? <CheckIcon size={14} /> : <PlusIcon size={14} />
              }
              onClick={() => (inReport ? removeItem(item.id) : addItem(item))}
              title={
                inReport
                  ? 'Remove from the working report'
                  : 'Add this chart to the working report'
              }
            >
              {inReport ? 'In report' : 'Add to report'}
            </Button>
          )}
        </Group>
        {spec.y_label && (
          <Text size="xs" c="dimmed">
            {spec.y_label}
          </Text>
        )}
        {/* Short tables size to their rows; charts and long tables get a box. */}
        <Box
          h={
            spec.kind === 'table' && (data?.rows.length ?? 0) <= 8
              ? 'auto'
              : 360
          }
        >
          {error ? (
            <Text size="sm" c="red">
              Couldn&apos;t load this chart&apos;s data: {error}
            </Text>
          ) : item ? (
            <AgentChart chart={item} onNotes={setChartNotes} />
          ) : (
            <Group h="100%" justify="center">
              <Loader size="sm" color="gray" />
            </Group>
          )}
        </Box>
        {(footer.length > 0 || sourceName) && (
          <Text size="xs" c="dimmed" lh={1.5}>
            {footer.join(' ')}
            {footer.length > 0 && sourceName && ' · '}
            {sourceName && (
              <>
                Source:{' '}
                {typeof source?.source_url === 'string' ? (
                  <Anchor
                    href={source.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="xs"
                    c="inherit"
                    underline="always"
                  >
                    {sourceName}
                  </Anchor>
                ) : (
                  sourceName
                )}
              </>
            )}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
