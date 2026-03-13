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
  Select,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { BASE_API_URL } from '@/config';
import { useProfile } from '@/components/profile/profileStore';

interface SourceMeta {
  label: string;
  group: string;
  description: string;
  primary_source: string;
}

interface Locations {
  counties: string[];
  towns: string[];
}

// Shape expected by Mantine Select with groups
interface SelectGroup {
  group: string;
  items: { value: string; label: string }[];
}

export default function DataExport() {
  const { myLocation } = useProfile();

  const [sources, setSources] = useState<Record<string, SourceMeta>>({});
  const [locations, setLocations] = useState<Locations>({
    counties: [],
    towns: [],
  });
  const [locationsLoading, setLocationsLoading] = useState(false);

  // Initialize area selection from the user's saved profile location
  const [selectedSource, setSelectedSource] = useState<string | null>(
    'census_housing',
  );
  const [selectedCounty, setSelectedCounty] = useState<string | null>(
    myLocation.type !== 'state' ? (myLocation.county ?? null) : null,
  );
  const [selectedTown, setSelectedTown] = useState<string | null>(
    myLocation.type === 'town' ? (myLocation.town ?? null) : null,
  );

  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load available export sources
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
      .catch(() => setLocationsLoading(false));
  }, []);

  // Build grouped options for the source Select
  const sourceSelectData: SelectGroup[] = Object.entries(sources).reduce<
    SelectGroup[]
  >((groups, [key, meta]) => {
    const group = groups.find((g) => g.group === meta.group);
    const item = { value: key, label: meta.label };
    if (group) {
      group.items.push(item);
    } else {
      groups.push({ group: meta.group, items: [item] });
    }
    return groups;
  }, []);

  function areaDescription(): string {
    if (selectedTown) return selectedTown;
    if (selectedCounty) return `${selectedCounty} County`;
    return 'Vermont (all)';
  }

  async function handleDownload() {
    setError(null);
    setSuccessMsg(null);

    if (!selectedSource) {
      setError('Please select a data topic.');
      return;
    }

    setDownloading(true);
    try {
      const body: Record<string, string | null> = { source: selectedSource };
      if (selectedCounty) body.county = selectedCounty;
      if (selectedTown) body.jurisdiction = selectedTown;

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
        ? `Downloaded ${rowCount} rows (capped at 10,000). For the full dataset, use the primary source linked below.`
        : `Downloaded ${rowCount} rows.`;
      setSuccessMsg(msg);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setDownloading(false);
    }
  }

  const currentSource = selectedSource ? sources[selectedSource] : undefined;

  return (
    <>
      <Center pt="xl" mb="xs">
        <Group gap="sm" align="center">
          <Title order={2}>Data Export</Title>
          <Badge color="orange" variant="filled" size="lg">
            Beta
          </Badge>
        </Group>
      </Center>
      <Center mb="xl">
        <Text c="dimmed" size="sm" maw={560} ta="center">
          Download Vermont data as a CSV file. Variables are exported with
          human-readable names (e.g. &ldquo;% Owner-Occupied Units&rdquo;)
          rather than raw census codes. For questions about methodology, see the
          primary source for each dataset.
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

          {/* Data topic */}
          <Card withBorder radius="md" p="lg">
            <Text fw={600} mb="md">
              1. Select a data topic
            </Text>
            {sourceSelectData.length === 0 ? (
              <Loader size="sm" />
            ) : (
              <Select
                placeholder="Choose a dataset…"
                data={sourceSelectData}
                value={selectedSource}
                onChange={setSelectedSource}
                searchable
              />
            )}

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
            <Text fw={600} mb="xs">
              2. Select a geographic area
            </Text>
            <Text size="xs" c="dimmed" mb="md">
              Defaults to your saved profile location. Leave both blank for all
              of Vermont.
            </Text>
            <Stack gap="sm">
              <Select
                label="County (optional)"
                placeholder={
                  locationsLoading ? 'Loading…' : 'All counties (statewide)'
                }
                data={locations.counties}
                value={selectedCounty}
                onChange={(v) => {
                  setSelectedCounty(v);
                  setSelectedTown(null);
                }}
                searchable
                clearable
                disabled={locationsLoading}
              />
              <Select
                label="Town / City (optional)"
                placeholder={
                  locationsLoading ? 'Loading…' : 'All towns in selected county'
                }
                data={locations.towns}
                value={selectedTown}
                onChange={setSelectedTown}
                searchable
                clearable
                disabled={locationsLoading}
              />
            </Stack>
          </Card>

          {/* Summary + download */}
          <Card withBorder radius="md" p="lg">
            <Text fw={600} mb="xs">
              3. Download
            </Text>
            <Text size="sm" c="dimmed" mb="xs">
              {currentSource?.label ?? '—'} &middot; {areaDescription()}
            </Text>
            <Text size="xs" c="dimmed" mb="md">
              Downloads are capped at 10,000 rows and 10 files per hour. Census
              ACS exports use human-readable variable labels rather than raw
              census codes — if you need the original codes for analysis, use
              the primary source directly.
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
