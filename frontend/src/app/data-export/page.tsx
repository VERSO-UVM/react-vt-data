'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Container,
  Divider,
  Group,
  Loader,
  Radio,
  Select,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { BASE_API_URL } from '@/config';

type AreaLevel = 'state' | 'county' | 'town';

interface SourceMeta {
  label: string;
  description: string;
  primary_source: string;
}

interface Locations {
  counties: string[];
  towns: string[];
}

const AREA_LEVELS: { value: AreaLevel; label: string }[] = [
  { value: 'state', label: 'Vermont (all)' },
  { value: 'county', label: 'County' },
  { value: 'town', label: 'Town / City' },
];

export default function DataExport() {
  const [sources, setSources] = useState<Record<string, SourceMeta>>({});
  const [locations, setLocations] = useState<Locations>({
    counties: [],
    towns: [],
  });
  const [locationsLoading, setLocationsLoading] = useState(false);

  const [selectedSource, setSelectedSource] = useState<string>('housing');
  const [areaLevel, setAreaLevel] = useState<AreaLevel>('state');
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
  const [selectedTown, setSelectedTown] = useState<string | null>(null);

  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load available sources
  useEffect(() => {
    fetch(`${BASE_API_URL}/export/sources`)
      .then((r) => r.json())
      .then(setSources)
      .catch(() => setError('Could not load available data sources.'));
  }, []);

  // Load county/town lists once
  useEffect(() => {
    setLocationsLoading(true);
    fetch(`${BASE_API_URL}/export/locations`)
      .then((r) => r.json())
      .then((data: Locations) => {
        setLocations(data);
        setLocationsLoading(false);
      })
      .catch(() => {
        setLocationsLoading(false);
      });
  }, []);

  function areaDescription(): string {
    if (areaLevel === 'county' && selectedCounty)
      return `${selectedCounty} County`;
    if (areaLevel === 'town' && selectedTown) return selectedTown;
    return 'Vermont (all jurisdictions)';
  }

  async function handleDownload() {
    setError(null);
    setSuccessMsg(null);

    if (areaLevel === 'county' && !selectedCounty) {
      setError('Please select a county.');
      return;
    }
    if (areaLevel === 'town' && !selectedTown) {
      setError('Please select a town.');
      return;
    }

    setDownloading(true);
    try {
      const body: Record<string, string | null> = { source: selectedSource };
      if (areaLevel === 'county') body.county = selectedCounty;
      if (areaLevel === 'town') body.jurisdiction = selectedTown;

      const res = await fetch(`${BASE_API_URL}/export/csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const detail = await res
          .json()
          .catch(() => ({ detail: res.statusText }));
        throw new Error(detail.detail ?? res.statusText);
      }

      const truncated = res.headers.get('X-Truncated') === 'true';
      const rowCount = res.headers.get('X-Row-Count');
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] ?? 'vt-data-export.csv';

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      const msg = truncated
        ? `Downloaded ${rowCount} rows (truncated to 10,000 row limit). For the full dataset, see the primary source linked below.`
        : `Downloaded ${rowCount} rows.`;
      setSuccessMsg(msg);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setDownloading(false);
    }
  }

  const currentSource = sources[selectedSource];

  return (
    <>
      <Center pt="xl" mb="xs">
        <Group gap="sm" align="center">
          <Title order={2}>Raw Data Export</Title>
          <Badge color="orange" variant="filled" size="lg">
            Beta
          </Badge>
        </Group>
      </Center>
      <Center mb="xl">
        <Text c="dimmed" size="sm" maw={560} ta="center">
          Download Vermont census data as a CSV file. Data is from the U.S.
          Census Bureau ACS 5-Year estimates. For large-scale or automated
          access, please use the primary sources directly.
        </Text>
      </Center>

      <Container size="sm">
        <Stack gap="lg">
          {error && (
            <Alert
              color="red"
              title="Error"
              onClose={() => setError(null)}
              withCloseButton
            >
              {error}
            </Alert>
          )}
          {successMsg && (
            <Alert
              color="green"
              title="Download complete"
              onClose={() => setSuccessMsg(null)}
              withCloseButton
            >
              {successMsg}
            </Alert>
          )}

          {/* Source selection */}
          <Card withBorder radius="md" p="lg">
            <Text fw={600} mb="md">
              1. Select a data topic
            </Text>
            <Radio.Group value={selectedSource} onChange={setSelectedSource}>
              <Stack gap="xs">
                {Object.entries(sources).map(([key, meta]) => (
                  <Radio key={key} value={key} label={meta.label} />
                ))}
                {Object.keys(sources).length === 0 && <Loader size="sm" />}
              </Stack>
            </Radio.Group>

            {currentSource && (
              <>
                <Divider my="sm" />
                <Text size="sm" c="dimmed">
                  {currentSource.description}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  Primary source:{' '}
                  <a
                    href={currentSource.primary_source}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {currentSource.primary_source}
                  </a>
                </Text>
              </>
            )}
          </Card>

          {/* Area selection */}
          <Card withBorder radius="md" p="lg">
            <Text fw={600} mb="md">
              2. Select a geographic area
            </Text>
            <Radio.Group
              value={areaLevel}
              onChange={(v) => setAreaLevel(v as AreaLevel)}
            >
              <Stack gap="xs" mb="md">
                {AREA_LEVELS.map(({ value, label }) => (
                  <Radio key={value} value={value} label={label} />
                ))}
              </Stack>
            </Radio.Group>

            {areaLevel === 'county' && (
              <Select
                placeholder={locationsLoading ? 'Loading…' : 'Select a county'}
                data={locations.counties}
                value={selectedCounty}
                onChange={setSelectedCounty}
                searchable
                clearable
                disabled={locationsLoading}
              />
            )}

            {areaLevel === 'town' && (
              <Select
                placeholder={
                  locationsLoading ? 'Loading…' : 'Search for a town'
                }
                data={locations.towns}
                value={selectedTown}
                onChange={setSelectedTown}
                searchable
                clearable
                disabled={locationsLoading}
              />
            )}
          </Card>

          {/* Summary + download */}
          <Card withBorder radius="md" p="lg">
            <Text fw={600} mb="xs">
              3. Download
            </Text>
            <Text size="sm" c="dimmed" mb="md">
              {currentSource?.label ?? '—'} &middot; {areaDescription()}
            </Text>
            <Text size="xs" c="dimmed" mb="md">
              Downloads are limited to 10,000 rows per file and 10 files per
              hour. For complete or repeated access, download directly from the
              primary source listed above.
            </Text>
            <Button
              onClick={handleDownload}
              loading={downloading}
              disabled={!currentSource}
              size="md"
              fullWidth
            >
              Download CSV
            </Button>
          </Card>
        </Stack>
      </Container>
    </>
  );
}
