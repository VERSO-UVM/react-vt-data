'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Center, Container,
         Divider, Group, Loader, Select, Stack, Text, Title,
         ThemeIcon, Paper} from '@mantine/core';
import { IconDownload, IconDatabase, IconMap } from '@tabler/icons-react';
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

  /* ---------------- LOAD SOURCES ---------------- */
  useEffect(() => {
    fetch(`${BASE_API_URL}/export/sources`)
      .then((r) => r.json())
      .then(setSources)
      .catch(() => setError('Could not load data sources.'));
  }, []);

  /* ---------------- LOAD LOCATIONS ---------------- */
  useEffect(() => {
    fetch(`${BASE_API_URL}/export/locations`)
      .then((r) => r.json())
      .then(setLocations)
      .catch(() => {});
  }, []);

  /* ---------------- GROUPED SELECT ---------------- */
  const sourceSelectData: SelectGroup[] = useMemo(() => {
    const groups: SelectGroup[] = [];

    Object.entries(sources).forEach(([key, meta]) => {
      let group = groups.find((g) => g.group === meta.group);

      if (!group) {
        group = { group: meta.group, items: [] };
        groups.push(group);
      }

      group.items.push({ value: key, label: meta.label });
    });

    return groups;
  }, [sources]);

  const currentSource = selectedSource ? sources[selectedSource] : undefined;

  function areaLabel() {
    if (selectedTown) return selectedTown;
    if (selectedCounty) return `${selectedCounty} County`;
    return 'Vermont (statewide)';
  }

  async function handleDownload() {
    setError(null);
    setSuccessMsg(null);

    if (!selectedSource) {
      setError('Please select a dataset.');
      return;
    }

    setDownloading(true);

    try {
      const body: Record<string, string | null> = {
        source: selectedSource,
      };

      if (selectedCounty) body.county = selectedCounty;
      if (selectedTown) body.jurisdiction = selectedTown;

      const res = await fetch(`${BASE_API_URL}/export/csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail ?? 'Download failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedSource}_export.csv`;
      a.click();

      URL.revokeObjectURL(url);

      setSuccessMsg('Download complete.');
    } catch (e: any) {
      setError(e.message ?? 'Download failed.');
    } finally {
      setDownloading(false);
    }
  }

  /* ---------------- UI ---------------- */
  return (
    <Container size="sm" py="xl">

      {/* HEADER */}
      <Center mb="lg">
        <Stack align="center" gap={6}>
          <Group gap="sm">
            <Title order={2}>Data Export</Title>
            <Badge color="blue" variant="light">
              Beta
            </Badge>
          </Group>

          <Text size="sm" c="dimmed" maw={520} ta="center">
            Download structured Vermont datasets as CSV. Data is cleaned and
            labeled for analysis (not raw census codes).
          </Text>
        </Stack>
      </Center>

      {/* ALERTS */}
      <Stack gap="sm" mb="md">
        {error && (
          <Alert color="red" onClose={() => setError(null)} withCloseButton>
            {error}
          </Alert>
        )}
        {successMsg && (
          <Alert
            color="green"
            onClose={() => setSuccessMsg(null)}
            withCloseButton
          >
            {successMsg}
          </Alert>
        )}
      </Stack>

      {/* STEP 1 */}
      <Card withBorder radius="md" p="lg" mb="md">
        <Group mb="sm">
          <ThemeIcon variant="light" color="blue">
            <IconDatabase size={16} />
          </ThemeIcon>
          <Text fw={600}>1. Select dataset</Text>
        </Group>

        {sourceSelectData.length === 0 ? (
          <Loader size="sm" />
        ) : (
          <Select
            placeholder="Choose a dataset"
            data={sourceSelectData}
            value={selectedSource}
            onChange={setSelectedSource}
            searchable
          />
        )}

        {currentSource && (
          <>
            <Divider my="sm" />
            <Text size="sm">{currentSource.description}</Text>

            <Text size="xs" c="dimmed" mt="xs">
              Source:{' '}
              <a
                href={currentSource.primary_source}
                target="_blank"
                rel="noreferrer"
              >
                documentation
              </a>
            </Text>
          </>
        )}
      </Card>

      {/* STEP 2 */}
      <Card withBorder radius="md" p="lg" mb="md">
        <Group mb="sm">
          <ThemeIcon variant="light" color="blue">
            <IconMap size={16} />
          </ThemeIcon>
          <Text fw={600}>2. Geographic scope</Text>
        </Group>

        <Text size="xs" c="dimmed" mb="md">
          Defaults to your profile location. Leave blank for statewide data.
        </Text>

        <Stack gap="sm">
          <Select
            label="County"
            placeholder="All counties"
            data={locations.counties}
            value={selectedCounty}
            onChange={(v) => {
              setSelectedCounty(v);
              setSelectedTown(null);
            }}
            searchable
            clearable
          />

          <Select
            label="Town"
            placeholder="All towns"
            data={locations.towns}
            value={selectedTown}
            onChange={setSelectedTown}
            searchable
            clearable
          />
        </Stack>

        <Paper mt="md" p="sm" radius="md" bg="gray.0">
          <Text size="sm">
            <b>Selected:</b> {areaLabel()}
          </Text>
        </Paper>
      </Card>

      {/* STEP 3 */}
      <Card
        withBorder
        radius="md"
        p="lg"
        style={{
          borderLeft: '4px solid #339af0',
        }}
      >
        <Group mb="xs">
          <ThemeIcon variant="light" color="blue">
            <IconDownload size={16} />
          </ThemeIcon>
          <Text fw={600}>3. Export data</Text>
        </Group>

        <Text size="sm" c="dimmed" mb="md">
          Downloads are limited to 10,000 rows per request for performance.
        </Text>

        <Button
          onClick={handleDownload}
          loading={downloading}
          fullWidth
          size="md"
        >
          Download CSV
        </Button>
      </Card>

    </Container>
  );
}