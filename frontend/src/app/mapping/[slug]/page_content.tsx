'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import VTMap from '@/components/mapping';
import {
  Box,
  Group,
  LoadingOverlay,
  Paper,
  Select,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';
import { BASE_API_URL } from '@/config';
import FilterContainer from '@/components/FilterUI/Filter_wrap';
import axios from 'axios';
import type { FeatureCollection } from 'geojson';

import MapLegend, { type LegendRow } from '@/components/Legend';

// NOTE: zoning is NOT here — it has its own route at /mapping/zoning, which
// takes precedence over this dynamic segment.
const MAP_CONFIG: Record<
  string,
  {
    title: string;
    initialURL?: string;
    filterURL?: string;
    dataURL?: string;
    legendURL?: string;
  }
> = {
  'flood-legal': {
    title: 'Flood Insurance',
  },
  'soil-suitability': {
    title: 'Soil Suitability',
    filterURL: `${BASE_API_URL}/filters/tree?filter_table=soil_suitability_info_soil_suit`,
    dataURL: `${BASE_API_URL}/load/mapping/wastewater/septic_soil_suitability`,
    legendURL: `${BASE_API_URL}/load/mapping/wastewater/septic_soil_legend`,
  },
  'treatment-facilities': {
    title: 'Wastewater Treatment Facilities',
    filterURL: `${BASE_API_URL}/filters/tree?filter_table=treatment_facilities_treatment_facility_info`,
    dataURL: `${BASE_API_URL}/load/mapping/wastewater/treatment_facility`,
  },
  'service-areas': {
    title: 'Wastewater Service Areas',
    filterURL: `${BASE_API_URL}/filters/tree?filter_table=service_areas_service_area_info`,
    dataURL: `${BASE_API_URL}/load/mapping/wastewater/service_area`,
  },
};

export default function MappingContent() {
  const params = useParams();
  const slug = params?.slug as string | undefined;

  const [data, setData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCountyLines, setShowCountyLines] = useState(true);

  const [legendData, setLegendData] = useState<LegendRow[]>([]);

  const config = slug ? MAP_CONFIG[slug] : undefined;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset map state on navigation to another slug
    setData(null);
  }, [slug]);

  useEffect(() => {
    if (!slug || (!config?.dataURL && !config?.initialURL)) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch effect: mark loading before the async request
    setLoading(true);

    // Filterable maps are POST-only and take a FilterRequest body, for now. TODO: At some point we'll go to FilterSource
    const request = config.dataURL
      ? axios.post(config.dataURL, { filters: {} })
      : axios.get(config.initialURL!);

    request
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug, config?.dataURL, config?.initialURL]);

  useEffect(() => {
    if (!slug || !config?.legendURL) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch effect: mark loading before the async request
    setLoading(true);

    axios
      .get(config.legendURL) //get the data
      .then((res) => setLegendData(res.data)) //set the data
      .catch(console.error) //catch any errors
      .finally(() => setLoading(false)); //say that loading is done
  }, [slug, config?.legendURL]); //do only once on initial render ideally

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
            <Box>
              <Title order={2}>{config?.title ?? slug}</Title>
              <Text size="sm" c="dimmed" mt={4}>
                Explore Vermont planning and environmental data.
              </Text>
            </Box>

            {/* Controls */}
            <Paper withBorder p="sm" radius="md" bg="gray.0">
              <Stack gap="sm">
                <Switch
                  checked={showCountyLines}
                  onChange={(event) =>
                    setShowCountyLines(event.currentTarget.checked)
                  }
                  label="Show Town Borders"
                />
              </Stack>
            </Paper>

            {/* Filters */}
            {config?.filterURL && config?.dataURL && (
              <FilterContainer
                apiURL={config.filterURL}
                dataURL={config.dataURL}
                onData={(fetchedData) =>
                  setData(fetchedData as FeatureCollection)
                }
              />
            )}
          </Stack>

          {/* Legend */}
          <MapLegend data={legendData}></MapLegend>
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
          <VTMap geojson={data} showCountyLines={showCountyLines} />
        </Box>
      </Group>
    </Box>
  );
}
