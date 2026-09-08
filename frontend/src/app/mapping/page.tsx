'use client';

import React from 'react';
import { Title, Center, Container, Text } from '@mantine/core';
import ExploratoryMappingGrid from '@/components/Grids/ExploratoryMappingOptions';

export const links = [
  {
    link: '/mapping/zoning',
    label: 'Zoning',
    description:
      'Explore zoning classifications by town to understand residential, commercial, agricultural, and mixed-use regulations across Vermont.',
    badges: ['Land Use', 'Municipal'],
  },
  {
    link: '/mapping/soil-suitability',
    label: 'Soil Suitability',
    description:
      'Assess soil limitations and suitability for on-site wastewater systems and rural development.',
    badges: ['NRCS', 'Septic'],
  },
  {
    link: '/mapping/treatment-facilities',
    label: 'Wastewater Treatment Facilities',
    description:
      'Explore locations of current public wastewater treatment facilities and their capacities.',
    badges: ['ANR', 'Wastewater'],
  },
  {
    link: '/mapping/service-areas',
    label: 'Wastewater System Service Areas',
    description: 'Examine current service areas of public wastewater systems.',
    badges: ['ANR', 'Wastewater'],
  },
  {
    link: '/mapping/flood-legal',
    label: 'Flood Insurance',
    description:
      'Identify FEMA flood hazard areas and understand development and insurance implications.',
    badges: ['FEMA', 'Flood Risk'],
  },
];

export default function BaseMappingPage() {
  return (
    <>
      <Center py={60}>
        <Container size="lg">
          <Title order={1} ta="center">
            Vermont Mapping Explorer
          </Title>

          <Text ta="center" c="dimmed" size="lg" maw={750} mx="auto" mt="md">
            Explore statewide zoning regulations, environmental constraints, and
            flood hazards through interactive geospatial datasets.
          </Text>
        </Container>
      </Center>

      <Container size="lg">
        <ExploratoryMappingGrid links={links} />
      </Container>

      <div style={{ height: 100 }} />
    </>
  );
}

/*
export default function BaseMappingPage() {
  const items = links.map((link) => {
    return (
      <Link href={link.link} key={link.link}>
        <Button style={{ display: 'flex', alignItems: 'center' }}>
          <span>{link.label}</span>
        </Button>
      </Link>
    );
  });

  return (
    <Box
      style={{
        position: 'relative',
        width: '100vw',
        height: 'calc(100vh - 80px)',
        overflow: 'hidden',
        backgroundColor: 'var(--mantine-color-body)',
        fontFamily: theme.fontFamily,
      }}
    >
      <Box style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <VTMap
          layers={mapLayers}
          showCountyLines={showCountyLines}
          targetBBox={selectedBBox}
        />
      </Box>

      <Box
        style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          width: '100%',
          maxWidth: 420,
          padding: '0 16px',
        }}
      >
        <Paper
          shadow="md"
          radius="md"
          p={4}
          withBorder
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Autocomplete
            placeholder="Search Vermont Town or City..."
            leftSection={<Search size={16} color={COLORS.spruce} />}
            data={optionsList}
            value={searchValue}
            onChange={setSearchValue}
            onOptionSubmit={handleSelectMunicipality}
            onKeyDown={handleKeyDown}
            variant="unstyled"
            styles={{
              input: {
                fontSize: '14px',
                fontWeight: 500,
                paddingLeft: '36px',
              },
            }}
          />
        </Paper>
      </Box>

      <Box
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 10,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 0,
        }}
      >
        <Paper
          shadow="md"
          radius="md"
          p="md"
          withBorder
          style={{
            width: sidebarOpen ? 340 : 0,
            opacity: sidebarOpen ? 1 : 0,
            overflow: 'hidden',
            pointerEvents: sidebarOpen ? 'all' : 'none',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            maxHeight: 'calc(100vh - 160px)',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Stack gap="xs" mb="xs">
            <Group justify="space-between" align="center">
              <Title
                order={3}
                style={{ fontFamily: theme.headings?.fontFamily, fontSize: 18 }}
              >
                Vermont Mapping
              </Title>
              <Text size="xs" c="dimmed" fw={600}>
                {activeLayers.size} active
              </Text>
            </Group>
          </Stack>

          {!selectedTown ? (
            <Paper
              p="md"
              radius="sm"
              style={{
                backgroundColor: 'var(--mantine-color-gray-0)',
                border: '1px dashed var(--mantine-color-gray-4)',
                textAlign: 'center',
              }}
            >
              <IconMapPin
                size={22}
                color="var(--mantine-color-gray-5)"
                style={{ marginBottom: 6 }}
              />
              <Text size="sm" fw={600} c="dimmed">
                No town selected
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Search for a town above to get started.
              </Text>
            </Paper>
          ) : (
            <>
              <Stack gap={6} mb="xs">
                <Group justify="space-between" align="center">
                  <Text size="sm" fw={700} c="dimmed" tt="uppercase">
                    Quick Start
                  </Text>
                  {activePresetId && (
                    <Button
                      variant="subtle"
                      size="compact-xs"
                      color="gray"
                      onClick={handlePresetClear}
                    >
                      Clear
                    </Button>
                  )}
                </Group>
                <SimpleGrid cols={2} spacing="xs">
                  {MAP_PRESETS.map((preset) => {
                    const Icon = PRESET_ICONS[preset.id] ?? IconLayersIntersect;
                    const isActive = activePresetId === preset.id;
                    return (
                      <Button
                        key={preset.id}
                        variant={isActive ? 'filled' : 'default'}
                        color={COLORS.spruce}
                        size="xs"
                        h="auto"
                        py={8}
                        justify="flex-start"
                        leftSection={<Icon size={16} />}
                        onClick={() => handlePresetSelect(preset)}
                        title={preset.description}
                        styles={{
                          label: { flex: 1 },
                        }}
                      >
                        <Group
                          gap={4}
                          wrap="nowrap"
                          justify="space-between"
                          w="100%"
                        >
                          <Text
                            size="xs"
                            fw={600}
                            style={{ whiteSpace: 'normal', lineHeight: 1.2 }}
                          >
                            {preset.label}
                          </Text>
                          {preset.definition && (
                            <Tooltip
                              label={preset.definition}
                              multiline
                              w={280}
                              withArrow
                              events={{ hover: true, focus: true, touch: true }}
                            >
                              <ActionIcon
                                component="span"
                                variant="transparent"
                                size="xs"
                                c={isActive ? 'white' : 'gray'}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <IconInfoCircle size={14} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Button>
                    );
                  })}
                </SimpleGrid>
              </Stack>

              <Divider my="xs" />

              <Paper
                p="xs"
                radius="sm"
                style={{
                  backgroundColor: 'var(--mantine-color-gray-0)',
                  border: '1px solid var(--mantine-color-gray-3)',
                }}
              >
                <Switch
                  checked={showCountyLines}
                  onChange={(event) =>
                    setShowCountyLines(event.currentTarget.checked)
                  }
                  color={COLORS.spruce}
                  label={
                    <Text size="sm" fw={600}>
                      Show Municipal Boundaries
                    </Text>
                  }
                  styles={{ track: { cursor: 'pointer' } }}
                />
              </Paper>

              <Box
                mt="xs"
                style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}
              >
                <LayerPanel
                  activeLayers={activeLayers}
                  onToggle={handleToggle}
                  onDataChange={handleDataChange}
                  presetFilters={presetFilters}
                  lockedLayerIds={lockedLayerIds}
                  townCandidates={townCandidates}
                  townBBox={selectedBBox}
                  scopeVersion={scopeVersion}
                />
              </Box>
            </>
          )}
        </Paper>

        <Paper
          shadow="md"
          radius="md"
          style={{
            borderTopLeftRadius: sidebarOpen ? 0 : undefined,
            borderBottomLeftRadius: sidebarOpen ? 0 : undefined,
            marginLeft: sidebarOpen ? -1 : 0,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <ActionIcon
            variant="subtle"
            color="gray"
            size="xl"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle Sidebar"
            px={sidebarOpen ? 'xs' : 'md'}
            style={{
              minWidth: sidebarOpen ? 40 : 110,
              transition: 'all 0.2s ease',
            }}
          >
            {sidebarOpen ? (
              <IconChevronLeft size={18} />
            ) : (
              <Group gap={6} align="center" wrap="nowrap">
                <Text size="sm" fw={600}>
                  Layers
                </Text>
                <IconLayersIntersect size={26} stroke={1.5} />
              </Group>
            )}
          </ActionIcon>
        </Paper>
      </Box>

      {selectedTown && (
        <Paper
          shadow="lg"
          withBorder
          style={{
            position: 'absolute',
            bottom: 0,
            left: sidebarOpen ? 370 : 16,
            right: 16,
            zIndex: 10,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            transition: 'left 0.3s ease',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Group
            justify="space-between"
            px="md"
            py="xs"
            onClick={() => setReportExpanded(!reportExpanded)}
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            <Group gap="xs">
              <IconChartBarPopular size={16} color={COLORS.spruce} />
              <Text
                size="xs"
                fw={700}
                style={{ fontFamily: theme.headings?.fontFamily }}
              >
                SPATIAL ANALYSIS & REPORT SUMMARY
              </Text>
              <Text size="xs" c="dimmed" ml="sm">
                • {totalLoadedFeatures.toLocaleString()} records active
              </Text>
            </Group>

            <Button
              variant="subtle"
              size="compact-xs"
              color="gray"
              rightSection={
                reportExpanded ? (
                  <IconChevronDown size={14} />
                ) : (
                  <IconChevronUp size={14} />
                )
              }
            >
              {reportExpanded ? 'Collapse Report' : 'Expand Insights'}
            </Button>
          </Group>

          <Collapse expanded={reportExpanded}>
            <Box p="md" style={{ maxHeight: '35vh', overflowY: 'auto' }}>
              <SimpleGrid cols={{ base: 1, md: 4 }} spacing="md">
                <Paper
                  withBorder
                  p="xs"
                  radius="sm"
                  bg="var(--mantine-color-body)"
                >
                  <Text size="sm" c="dimmed" fw={600}>
                    Total Rendered Features
                  </Text>
                  <Text fw={700} size="xl" c={COLORS.spruce}>
                    {totalLoadedFeatures.toLocaleString()}
                  </Text>
                </Paper>

                <Paper
                  withBorder
                  p="xs"
                  radius="sm"
                  bg="var(--mantine-color-body)"
                >
                  <Text size="sm" c="dimmed" fw={600}>
                    Buildable Acreage
                  </Text>
                  {buildableAcres !== null ? (
                    <Text fw={700} size="xl" c={COLORS.spruce}>
                      {Math.round(buildableAcres).toLocaleString()} ac
                    </Text>
                  ) : (
                    <Text size="sm" c="dimmed" fs="italic" mt={6}>
                      Enable the Zoning layer to see acreage
                    </Text>
                  )}
                </Paper>

                <Paper
                  withBorder
                  p="xs"
                  radius="sm"
                  bg="var(--mantine-color-body)"
                >
                  <Text size="sm" c="dimmed" fw={600} mb="xs">
                    Layer Density Distribution
                  </Text>
                  {activeLayers.size === 0 ? (
                    <Text size="xs" c="dimmed" fs="italic">
                      No active layer data
                    </Text>
                  ) : (
                    <Stack gap={6}>
                      {MAP_LAYERS.filter((l) => activeLayers.has(l.id)).map(
                        (layer) => {
                          const count =
                            layerData[layer.id]?.features?.length || 0;
                          return (
                            <Box key={layer.id}>
                              <Group justify="space-between" mb={2}>
                                <Text size="sm" fw={500} lineClamp={1}>
                                  {layer.title}
                                </Text>
                                <Text size="sm" c="dimmed">
                                  {count}
                                </Text>
                              </Group>
                              <Progress
                                value={
                                  totalLoadedFeatures > 0
                                    ? (count / totalLoadedFeatures) * 100
                                    : 0
                                }
                                color={layer.color}
                                size="xs"
                                radius="xl"
                              />
                            </Box>
                          );
                        },
                      )}
                    </Stack>
                  )}
                </Paper>

                <Paper
                  withBorder
                  p="xs"
                  radius="sm"
                  bg="var(--mantine-color-body)"
                >
                  <Text size="sm" c="dimmed" fw={600} mb={4}>
                    Regional Findings
                  </Text>
                  <Box
                    mt="xs"
                    h={70}
                    style={{
                      border: '1px dashed var(--mantine-color-default-border)',
                      borderRadius: theme.radius.sm,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text size="xs" c="dimmed">
                      Chart Canvas / Spatial Distribution Plot
                    </Text>
                  </Box>
                </Paper>
              </SimpleGrid>
            </Box>
          </Collapse>
        </Paper>
      )}
    </Box>
  );
}
