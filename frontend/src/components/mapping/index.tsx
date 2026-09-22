'use client';

import { Fragment, useState, useCallback, useEffect, useRef } from 'react';
import { Map } from 'react-map-gl/maplibre';
import { GeoJsonLayer } from '@deck.gl/layers';
import DeckGL from '@deck.gl/react';
import { FlyToInterpolator } from '@deck.gl/core';
import { WebMercatorViewport } from '@math.gl/web-mercator';
import type { LayersList } from '@deck.gl/core';
import type { FeatureCollection } from 'geojson';
import {
  Paper,
  Card,
  Divider,
  ActionIcon,
  Group,
  Stack,
  Text,
  Badge,
  SimpleGrid,
} from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { COLORS, FONTS } from '@/app/theme';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { MapRef } from 'react-map-gl/maplibre';

const CURRENCY_FIELDS = new Set(['Assessed Value', 'Value Per Acre']);
const BOOLEAN_FIELDS = new Set(['Vacant Land', 'Out-of-State Owner']);

function formatDetailValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—'; // e.g. no tax record on file for this parcel
  }
  if (CURRENCY_FIELDS.has(key) && typeof value === 'number') {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
  }
  if (BOOLEAN_FIELDS.has(key)) {
    return value ? 'Yes' : 'No';
  }
  if (key === 'Acres' && typeof value === 'number') {
    return `${value.toLocaleString()} ac`;
  }
  return String(value);
}

/** Groups the flat tooltip fields into the labeled sections a parcel's
 *  detail card is organized into — Location, Valuation (rendered as stat
 *  tiles), Owner — with anything left over (and every non-parcel layer,
 *  which won't match any of these field names) falling into a plain
 *  "Details" catch-all so the same card still works generically. Each
 *  section gets its own accent color so the card reads as distinct,
 *  physically separate blocks rather than one long list. */
const DETAIL_GROUPS: {
  title: string;
  fields: string[];
  stat?: boolean;
  accent: string;
}[] = [
  {
    title: 'Location',
    fields: ['Address', 'Jurisdiction', 'County'],
    accent: COLORS.spruce,
  },
  {
    title: 'Valuation',
    fields: ['Assessed Value', 'Value Per Acre', 'Acres', 'Buildable'],
    stat: true,
    accent: COLORS.amber,
  },
  {
    title: 'Owner',
    fields: [
      'Primary Owner',
      'Secondary Owner',
      'Mailing City',
      'Mailing State',
      'Out-of-State Owner',
    ],
    accent: COLORS.slate,
  },
];
const DEFAULT_ACCENT = COLORS.slate;

const SECTION_LABEL_STYLE = {
  fontFamily: FONTS.mono,
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
};

function DetailRow({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === '') {
    return null; // missing source data (e.g. no owner on file) — skip, not "null"
  }
  if (BOOLEAN_FIELDS.has(label) && value === false) {
    // "Out-of-State Owner: No" / "Vacant Land: No" is noise on a compact
    // card — only surface these when they're actually true.
    return null;
  }
  if (label === 'Out-of-State Owner') {
    return value ? (
      <Badge color="orange" variant="filled" size="md">
        Out-of-state owner
      </Badge>
    ) : null;
  }
  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
      <Text size="md" c={COLORS.slate} fw={500}>
        {label}
      </Text>
      <Text size="md" fw={700} ta="right" style={{ color: COLORS.ink }}>
        {formatDetailValue(label, value)}
      </Text>
    </Group>
  );
}

function StatTile({ label, value }: { label: string; value: unknown }) {
  return (
    <Paper radius="md" p="sm" style={{ background: '#fff' }}>
      <Text
        style={{
          fontFamily: FONTS.display,
          fontWeight: 800,
          fontSize: '1.4rem',
          lineHeight: 1.15,
          color: COLORS.spruce,
        }}
      >
        {formatDetailValue(label, value)}
      </Text>
      <Text
        mt={4}
        style={{ ...SECTION_LABEL_STYLE, fontSize: 11, color: COLORS.slate }}
      >
        {label}
      </Text>
    </Paper>
  );
}

export interface MapLayerItem {
  id: string;
  geojson: FeatureCollection | null;
  visible: boolean;
}

interface MyMapProps {
  layers?: MapLayerItem[];
  geojson?: FeatureCollection | null;
  baseGeojson?: FeatureCollection | null;
  showCountyLines: boolean;
  controllerOn?: boolean;
  initialZoom?: number;
  targetBBox?: [number, number, number, number] | null;
  /**
   * Optional context layer drawn *underneath* `geojson` — e.g. the grey
   * "no zoning information here" areas on the zoning map. Features carry their
   * own `rgba_color` and `tooltip` properties, exactly like the main layer.
   */
  largeBorders?: boolean;
  /** Fires with the hovered feature's `tooltip.__title__` (or null on unhover) — lets a sibling component (e.g. a scatterplot) highlight the matching point. */
  onFeatureHover?: (id: string | null) => void;
  /** Feature to visually emphasize, keyed by `tooltip.__title__` — set this from a sibling component's own hover to highlight the corresponding region here. */
  highlightId?: string | null;
}

const BASE_STYLES = {
  OSM: 'https://tiles.basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  Dark: 'https://tiles.basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
};

const VERMONT_BOUNDS = {
  latitude: { min: 42.7, max: 45.0 },
  longitude: { min: -73.5, max: -71.5 },
  zoom: { min: 7, max: 20 },
};

const INITIAL_VIEW_STATE = {
  longitude: -72.7,
  latitude: 43.9,
  zoom: 7,
  pitch: 0,
  bearing: 0,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function VTMap({
  layers: layerConfigs,
  geojson = null,
  baseGeojson = null,
  showCountyLines,
  controllerOn = true,
  initialZoom = 7,
  targetBBox,
  largeBorders = false,
  onFeatureHover,
  highlightId = null,
}: MyMapProps) {
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [viewState, setViewState] = useState<any>({
    ...INITIAL_VIEW_STATE,
    zoom: initialZoom,
  });

  // Handle targetBBox camera transitions via WebMercatorViewport & FlyToInterpolator
  useEffect(() => {
    if (!targetBBox) return;

    const [west, south, east, north] = targetBBox;
    if (west === 0 && south === 0) return;

    // Get current container width/height or fallback to window dimensions
    const width = containerRef.current?.clientWidth || window.innerWidth;
    const height = containerRef.current?.clientHeight || window.innerHeight;

    try {
      const viewport = new WebMercatorViewport({ width, height });

      const { longitude, latitude, zoom } = viewport.fitBounds(
        [
          [west, south],
          [east, north],
        ],
        {
          padding: { top: 80, bottom: 80, left: 380, right: 80 },
        },
      );

      setViewState((prev: any) => ({
        ...prev,
        longitude,
        latitude,
        zoom: clamp(zoom, VERMONT_BOUNDS.zoom.min, VERMONT_BOUNDS.zoom.max),
        transitionDuration: 1800,
        transitionInterpolator: new FlyToInterpolator(),
      }));
    } catch (err) {
      console.error('Failed to fit bounds:', err);
    }
  }, [targetBBox]);

  const activeLayers: MapLayerItem[] = layerConfigs ?? [
    ...(baseGeojson
      ? [{ id: 'base-geojson', geojson: baseGeojson, visible: true }]
      : []),
    ...(geojson ? [{ id: 'main-geojson', geojson, visible: true }] : []),
  ];

  const [baseStyle] = useState(BASE_STYLES.OSM);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: Record<string, unknown>;
  } | null>(null);
  const [countylines, setCountylines] = useState<FeatureCollection | null>(
    null,
  );

  useEffect(() => {
    fetch('/data/municipalites.json')
      .then((res) => res.json())
      .then((raw) =>
        setCountylines({ type: 'FeatureCollection', features: raw.features }),
      )
      .catch(() => {});
  }, []);

  const onViewStateChange = useCallback((params: { viewState: any }) => {
    const vs = params.viewState;
    setViewState({
      ...vs,
      zoom: clamp(vs.zoom, VERMONT_BOUNDS.zoom.min, VERMONT_BOUNDS.zoom.max),
      latitude: clamp(
        vs.latitude,
        VERMONT_BOUNDS.latitude.min,
        VERMONT_BOUNDS.latitude.max,
      ),
      longitude: clamp(
        vs.longitude,
        VERMONT_BOUNDS.longitude.min,
        VERMONT_BOUNDS.longitude.max,
      ),
    });
  }, []);

  const onHover = (info: {
    x: number;
    y: number;
    object?: { properties: { tooltip: Record<string, unknown> } };
  }) => {
    if (info.object) {
      setTooltip({
        x: info.x,
        y: info.y,
        content: info.object.properties.tooltip,
      });
      onFeatureHover?.(String(info.object.properties.tooltip?.__title__ ?? ''));
    } else {
      setTooltip(null);
      onFeatureHover?.(null);
    }
  };

  const [selected, setSelected] = useState<Record<string, unknown> | null>(
    null,
  );

  const onClick = (info: {
    object?: { properties: { tooltip: Record<string, unknown> } };
  }) => {
    setSelected(info.object ? info.object.properties.tooltip : null);
  };

  const [lineWidth, setLineWidth] = useState<number>(0.5);
  const [lineColor, setLineColor] = useState<[number, number, number, number]>([
    80, 80, 80, 80,
  ]);

  useEffect(() => {
    if (largeBorders) {
      setLineWidth(3);
      setLineColor([0, 0, 0, 100]);
    } else {
      setLineWidth(0.5);
      setLineColor([80, 80, 80, 80]);
    }
  }, [largeBorders]);

  const getFillColor = (d: {
    properties?: { rgba_color?: [number, number, number, number] };
  }) => d.properties?.rgba_color ?? [0, 0, 0, 0];

  const isHighlighted = (d: {
    properties?: { tooltip?: Record<string, unknown> };
  }) =>
    highlightId != null &&
    String(d.properties?.tooltip?.__title__ ?? '') === highlightId;

  // Property lines need to read as distinct boundaries at any zoom, even
  // over an unfilled/light-colored parcel — the translucent-white outline
  // every other (thematic-fill) layer uses is too subtle for that job.
  const DEFAULT_LINE_COLOR: [number, number, number, number] = [
    255, 255, 255, 130,
  ];
  const PARCEL_LINE_COLOR: [number, number, number, number] = [55, 65, 81, 220]; // gray-700

  const makeGetLineColor =
    (baseColor: [number, number, number, number]) =>
    (d: {
      properties?: { tooltip?: Record<string, unknown> };
    }): [number, number, number, number] =>
      isHighlighted(d) ? [255, 209, 0, 255] : baseColor;

  const getLineWidth = (d: {
    properties?: { tooltip?: Record<string, unknown> };
  }) => (isHighlighted(d) ? 3 : 1);

  const deckLayers: LayersList = activeLayers
    .filter((layer) => layer.visible && layer.geojson)
    .map(
      (layer) =>
        new GeoJsonLayer({
          id: `layer-${layer.id}`,
          data: layer.geojson!,
          filled: true,
          pointType: 'circle',
          pointRadiusUnits: 'pixels',
          pointRadiusMinPixels: 8,
          pointRadiusMaxPixels: 12,
          getFillColor,
          stroked: true,
          getLineColor: makeGetLineColor(
            layer.id === 'parcels' ? PARCEL_LINE_COLOR : DEFAULT_LINE_COLOR,
          ),
          lineWidthUnits: 'pixels',
          getLineWidth,
          lineWidthMinPixels: 0.5,
          lineWidthMaxPixels: 3,
          updateTriggers: {
            getLineColor: [highlightId],
            getLineWidth: [highlightId],
          },
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 180],
          onHover,
        }),
    );

  if (showCountyLines && countylines) {
    deckLayers.push(
      new GeoJsonLayer({
        id: 'county-lines',
        data: countylines,
        filled: false,
        stroked: true,
        getLineColor: [80, 80, 80, 200],
        lineWidthMinPixels: 1,
      }),
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
      }}
    >
      <div
        style={{
          flex: 1,
          position: 'relative',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <DeckGL
          viewState={viewState}
          onViewStateChange={onViewStateChange}
          controller={controllerOn}
          layers={deckLayers}
          onClick={onClick}
          style={{ width: '100%', height: '100%' }}
        >
          <Map ref={mapRef} mapStyle={baseStyle} />
        </DeckGL>

        {tooltip && tooltip.content && (
          <Paper
            shadow="md"
            radius="md"
            p="sm"
            withBorder
            style={{
              position: 'absolute',
              left: tooltip.x + 12,
              top: tooltip.y + 12,
              pointerEvents: 'none',
              zIndex: 1000,
              maxWidth: 300,
              borderColor: COLORS.line,
              background: COLORS.birch,
              fontFamily: FONTS.body,
            }}
          >
            <Text
              fw={700}
              size="md"
              style={{ fontFamily: FONTS.display, color: COLORS.spruce }}
            >
              {String(tooltip.content.__title__ ?? 'Details')}
            </Text>
            <Divider my={6} color={COLORS.line} />
            <Stack gap={4}>
              {Object.entries(tooltip.content).map(
                ([k, v]) =>
                  k !== '__title__' &&
                  v !== null &&
                  v !== undefined &&
                  v !== '' && (
                    <Group
                      key={k}
                      justify="space-between"
                      align="flex-start"
                      wrap="nowrap"
                      gap="sm"
                    >
                      <Text size="xs" c={COLORS.slate} fw={500}>
                        {k}
                      </Text>
                      <Text
                        size="xs"
                        fw={700}
                        ta="right"
                        style={{ color: COLORS.ink }}
                      >
                        {formatDetailValue(k, v)}
                      </Text>
                    </Group>
                  ),
              )}
            </Stack>
          </Paper>
        )}

        {selected && (
          <Card
            withBorder
            radius="lg"
            p={0}
            shadow="xl"
            style={{
              position: 'absolute',
              right: 12,
              top: 12,
              bottom: 12,
              width: 340,
              overflowY: 'auto',
              zIndex: 1000,
              borderColor: COLORS.line,
              background: COLORS.birch,
              fontFamily: FONTS.body,
            }}
          >
            <Group
              justify="space-between"
              align="center"
              wrap="nowrap"
              p="lg"
              pb="md"
              style={{
                background: COLORS.birch,
                position: 'sticky',
                top: 0,
                zIndex: 1,
              }}
            >
              <Text
                fw={800}
                size="xl"
                style={{ fontFamily: FONTS.display, color: COLORS.spruce }}
              >
                {String(selected.__title__ ?? 'Details')}
              </Text>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="md"
                aria-label="Close details"
                onClick={() => setSelected(null)}
                style={{ color: COLORS.spruceDeep }}
              >
                <IconX size={18} />
              </ActionIcon>
            </Group>
            <Stack gap="md" p="lg" pt="md">
              {(() => {
                // Named `fields` rather than `Map` to avoid shadowing the
                // react-map-gl `Map` component imported at the top of this file.
                const fields = Object.entries(selected).filter(
                  ([k]) => k !== '__title__',
                );
                const claimed = new Set<string>();

                const sections = DETAIL_GROUPS.map((group) => {
                  const entries = fields.filter(([k]) =>
                    group.fields.includes(k),
                  );
                  entries.forEach(([k]) => claimed.add(k));
                  return { ...group, entries };
                }).filter((g) => g.entries.length > 0);

                // Anything the layer's tooltip carries that isn't one of the
                // named parcel fields above — the only path non-parcel layers
                // take, so the card still works generically for them.
                const leftover = fields.filter(([k]) => !claimed.has(k));
                if (leftover.length > 0) {
                  sections.push({
                    title: 'Details',
                    fields: [],
                    stat: false,
                    entries: leftover,
                    accent: DEFAULT_ACCENT,
                  });
                }

                return sections.map((section) => (
                  <Paper
                    key={section.title}
                    radius="md"
                    p="md"
                    withBorder
                    style={{
                      background: '#fff',
                      borderColor: COLORS.line,
                      borderLeft: `4px solid ${section.accent}`,
                    }}
                  >
                    <Text
                      style={{ ...SECTION_LABEL_STYLE, color: section.accent }}
                      mb={10}
                    >
                      {section.title}
                    </Text>
                    {section.stat ? (
                      <SimpleGrid cols={2} spacing="sm">
                        {section.entries.map(([k, v]) => (
                          <StatTile key={k} label={k} value={v} />
                        ))}
                      </SimpleGrid>
                    ) : (
                      <Stack gap={10}>
                        {section.entries.map(([k, v], i) => (
                          <Fragment key={k}>
                            {i > 0 && <Divider color={COLORS.line} />}
                            <DetailRow label={k} value={v} />
                          </Fragment>
                        ))}
                      </Stack>
                    )}
                  </Paper>
                ));
              })()}
            </Stack>
          </Card>
        )}
      </div>
    </div>
  );
}
