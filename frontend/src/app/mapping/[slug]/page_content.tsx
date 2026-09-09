'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import axios from 'axios';
import type { FeatureCollection } from 'geojson';

import VTMap from '@/components/mapping';
import FilterContainer from '@/components/FilterUI/Filter_wrap';
import MapLegend, { type LegendRow } from '@/components/Legend';
import { BASE_API_URL } from '@/config';

import {
  Box,
  Group,
  LoadingOverlay,
  Paper,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';

type MapConfig = {
  title: string;
  initialURL: string;
  initialMethod: 'GET' | 'POST';
  filterURL?: string;
  dataURL?: string;
  legendURL?: string;
  townBorder?: boolean;
  largeBorder?: boolean;
};

const MAP_CONFIG: Record<string, MapConfig> = {
  'flood-legal': {
    title: 'Flood Insurance',
    initialURL: `${BASE_API_URL}/load/mapping/flood_legal`,
    initialMethod: 'GET',
  },

  'soil-suitability': {
    title: 'Soil Suitability',
    initialURL: `${BASE_API_URL}/load/mapping/wastewater/septic_soil_suitability`,
    initialMethod: 'POST',
    filterURL: `${BASE_API_URL}/filters/tree?filter_table=VersoWastewater_soilSuitability_info`,
    dataURL: `${BASE_API_URL}/load/mapping/wastewater/septic_soil_suitability`,
    legendURL: `${BASE_API_URL}/load/mapping/wastewater/septic_soil_legend`,
  },

  'treatment-facilities': {
    title: 'Wastewater Treatment Facilities',
    initialURL: `${BASE_API_URL}/load/mapping/wastewater/treatment_facility`,
    initialMethod: 'POST',
    filterURL: `${BASE_API_URL}/filters/tree?filter_table=VersoWastewater_treatmentFacilities_info`,
    dataURL: `${BASE_API_URL}/load/mapping/wastewater/treatment_facility`,
  },

  'service-areas': {
    title: 'Wastewater Service Areas',
    initialURL: `${BASE_API_URL}/load/mapping/wastewater/service_area`,
    initialMethod: 'POST',
    filterURL: `${BASE_API_URL}/filters/tree?filter_table=VersoWastewater_serviceAreas_info`,
    dataURL: `${BASE_API_URL}/load/mapping/wastewater/service_area`,
  },

  ambulance: {
    title: 'Ambulance Service Areas',
    initialURL: `${BASE_API_URL}/load/mapping/ambulance/service_area`,
    initialMethod: 'POST',
    filterURL: `${BASE_API_URL}/filters/tree?filter_table=VCGI_ambulanceService_info`,
    dataURL: `${BASE_API_URL}/load/mapping/ambulance/service_area`,
    legendURL: `${BASE_API_URL}/load/mapping/ambulance/ambulance_legend`,
    townBorder: false,
    largeBorder: true,
  },
};

export default function MappingContent() {
  const params = useParams();
  const slug = params?.slug as string | undefined;
  const config = slug ? MAP_CONFIG[slug] : undefined;

  const townBorderDef = config?.townBorder ?? false;
  const largeBorderDef = config?.largeBorder ?? true;

  const [data, setData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [legendLoading, setLegendLoading] = useState(false);

  const [showCountyLines, setShowCountyLines] = useState(townBorderDef);

  const [largeBorder, setLargeBorder] = useState(largeBorderDef);

  const [legendData, setLegendData] = useState<LegendRow[]>([]);

  /*
   * Reset map state when navigating between map pages.
   */
  useEffect(() => {
    setData(null);
    setLegendData([]);
    setShowCountyLines(townBorderDef);
    setLargeBorder(largeBorderDef);
  }, [slug, townBorderDef, largeBorderDef]);

  /*
   * Load initial map data.
   *
   * Filterable maps use POST with an empty filter object.
   * Non-filterable maps use their configured GET endpoint.
   */
  useEffect(() => {
    if (!config) return;

    let cancelled = false;

    const loadData = async () => {
      setLoading(true);

      try {
        const response =
          config.initialMethod === 'POST'
            ? await axios.post(config.dataURL ?? config.initialURL, {
                filters: {},
              })
            : await axios.get(config.initialURL);

        if (!cancelled) {
          setData(response.data as FeatureCollection);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load map data:', error);
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [config]);

  /*
   * Load map legend when one exists.
   */
  useEffect(() => {
    const legendURL = config?.legendURL;

    if (!legendURL) {
      setLegendData([]);
      return;
    }

    let cancelled = false;

    const loadLegend = async () => {
      setLegendLoading(true);

      try {
        const response = await axios.get(legendURL);

        if (!cancelled) {
          setLegendData(response.data as LegendRow[]);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load map legend:', error);
          setLegendData([]);
        }
      } finally {
        if (!cancelled) {
          setLegendLoading(false);
        }
      }
    };

    loadLegend();

    return () => {
      cancelled = true;
    };
  }, [config]);

  if (!config) {
    return (
      <Box p="md">
        <Title order={2}>Map Not Found</Title>

        <Text c="dimmed" mt="xs">
          The requested map could not be found.
        </Text>
      </Box>
    );
  }

  const borderSwitchText = `Show ${config.title}`;

  return (
    <Box h="calc(100vh - 80px)" style={{ overflow: 'hidden' }}>
      <Group h="100%" align="stretch" gap="md" wrap="nowrap">
        {/* Sidebar */}
        <Paper
          w={360}
          p="md"
          withBorder
          shadow="xs"
          style={{
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          <Stack gap="md">
            {/* Header */}
            <Box>
              <Title order={2}>{config.title}</Title>

              <Text size="sm" c="dimmed" mt={4}>
                Explore Vermont planning and environmental data.
              </Text>
            </Box>

            {/* Map controls */}
            <Paper withBorder p="sm" radius="md" bg="gray.0">
              <Stack gap="sm">
                <Switch
                  checked={showCountyLines}
                  onChange={(event) =>
                    setShowCountyLines(event.currentTarget.checked)
                  }
                  label="Show Town Borders"
                />

                <Switch
                  checked={largeBorder}
                  onChange={(event) =>
                    setLargeBorder(event.currentTarget.checked)
                  }
                  label={borderSwitchText}
                />
              </Stack>
            </Paper>

            {/* Filters */}
            {config.filterURL && config.dataURL && (
              <FilterContainer
                apiURL={config.filterURL}
                dataURL={config.dataURL}
                onData={(fetchedData) =>
                  setData(fetchedData as FeatureCollection)
                }
              />
            )}

            {/* Legend */}
            {config.legendURL && (
              <LoadingOverlay visible={legendLoading} zIndex={10} />
            )}

            {config.legendURL && legendData.length > 0 && (
              <MapLegend data={legendData} />
            )}
          </Stack>
        </Paper>

        {/* Map */}
        <Box
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 8,
          }}
        >
          <LoadingOverlay visible={loading} zIndex={1000} />

          <VTMap
            geojson={data}
            showCountyLines={showCountyLines}
            largeBorders={largeBorder}
          />
        </Box>
      </Group>
    </Box>
  );
}
