'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Loader,
  Select,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconDownload, IconDatabase, IconMap } from '@tabler/icons-react';
import { motion } from 'motion/react';
import { BASE_API_URL } from '@/config';
import { useProfile } from '@/components/profile/profileStore';
import { COLORS, FONTS } from '@/app/theme';

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
    } catch (e) {
      setError((e as Error).message ?? 'Download failed.');
    } finally {
      setDownloading(false);
    }
  }

  /* ---------------- UI ---------------- */
  return (
    <Box style={{ minHeight: '100vh', backgroundColor: COLORS.birchDim }}>
      <Container size="sm" py={{ base: 50, sm: 80 }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <Stack align="center" gap={8} mb={36}>
            <Group gap={10}>
              <Box style={{ width: 24, height: 1, background: COLORS.spruce }} />
              <Text
                fw={1000}
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: 14,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: COLORS.spruce,
                }}
              >
                Data Export
              </Text>
              <Box style={{ width: 24, height: 1, background: COLORS.spruce }} />
            </Group>

            <Group gap="sm" justify="center">
              <Title
                order={1}
                ta="center"
                style={{
                  fontFamily: FONTS.display,
                  color: COLORS.ink,
                  fontSize: 'clamp(2rem, 5vw, 3rem)',
                  lineHeight: 1.05,
                }}
              >
                Download Vermont data
              </Title>
              <Badge
                variant="light"
                style={{
                  backgroundColor: COLORS.birch,
                  color: COLORS.spruce,
                }}
              >
                Beta
              </Badge>
            </Group>

            <Text size="sm" c="dimmed" maw={480} ta="center">
              Download a clean and labeled CSV. Pick a dataset and an
              area below to get started.
            </Text>
          </Stack>
        </motion.div>

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

        {/* CENTERPIECE PANEL */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <Card
            radius="xl"
            p={{ base: 'lg', sm: 40 }}
            style={{
              border: `1px solid ${COLORS.line}`,
              background: COLORS.birch,
              boxShadow: '0 24px 60px rgba(20, 35, 25, 0.10)',
            }}
          >
            <Stack gap="lg">
              {/* DATASET */}
              <Box>
                <Group gap={8} mb={10}>
                  <IconDatabase size={16} style={{ color: COLORS.spruce }} />
                  <Text
                    size="md"
                    fw={1000}
                    style={{
                      fontFamily: FONTS.mono,
                      textTransform: 'uppercase',
                      letterSpacing: '.06em',
                      color: COLORS.slate,
                    }}
                  >
                    Dataset
                  </Text>
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
                    size="md"
                    radius="md"
                  />
                )}

                {currentSource && (
                  <Box mt="sm">
                    <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                      {currentSource.description}
                    </Text>
                    <Text size="xs" c="dimmed" mt={6}>
                      Source:{' '}
                      <a
                        href={currentSource.primary_source}
                        target="_blank"
                        rel="noreferrer"
                      >
                        documentation
                      </a>
                    </Text>
                  </Box>
                )}
              </Box>

              <Divider style={{ borderColor: COLORS.line }} />

              {/* AREA */}
              <Box>
                <Group gap={8} mb={10}>
                  <IconMap size={16} style={{ color: COLORS.spruce }} />
                  <Text
                    size="md"
                    fw={1000}
                    style={{
                      fontFamily: FONTS.mono,
                      textTransform: 'uppercase',
                      letterSpacing: '.06em',
                      color: COLORS.slate,
                    }}
                  >
                    Area
                  </Text>
                  <Text size="xs" c="dimmed">
                    — defaults to your profile, leave blank for statewide
                  </Text>
                </Group>

                <Group grow gap="sm">
                  <Select
                    placeholder="All counties"
                    data={locations.counties}
                    value={selectedCounty}
                    onChange={(v) => {
                      setSelectedCounty(v);
                      setSelectedTown(null);
                    }}
                    searchable
                    clearable
                    size="md"
                    radius="md"
                  />

                  <Select
                    placeholder="All towns"
                    data={locations.towns}
                    value={selectedTown}
                    onChange={setSelectedTown}
                    searchable
                    clearable
                    size="md"
                    radius="md"
                  />
                </Group>
              </Box>

              <Divider style={{ borderColor: COLORS.line }} />

              {/* SUMMARY + ACTION */}
              <Group
                justify="space-between"
                align="center"
                wrap="wrap"
                gap="md"
              >
                <Box>
                  <Text
                    size="xs"
                    style={{
                      fontFamily: FONTS.mono,
                      textTransform: 'uppercase',
                      letterSpacing: '.06em',
                      color: COLORS.slate,
                    }}
                  >
                    Selected area
                  </Text>
                  <Text fw={600}>{areaLabel()}</Text>
                </Box>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  style={{ flex: '1 1 220px' }}
                >
                  <Button
                    onClick={handleDownload}
                    loading={downloading}
                    fullWidth
                    size="md"
                    radius="md"
                    leftSection={<IconDownload size={18} />}
                    styles={{
                      root: {
                        backgroundColor: COLORS.amber,
                        color: COLORS.spruceDeep,
                        fontWeight: 600,
                        '&:hover': { backgroundColor: COLORS.amberSoft },
                      },
                    }}
                  >
                    Download CSV
                  </Button>
                </motion.div>
              </Group>

              <Text size="xs" c="dimmed" ta="center">
                Downloads are limited to 10,000 rows per request for
                performance.
              </Text>
            </Stack>
          </Card>
        </motion.div>
      </Container>
    </Box>
  );
}
