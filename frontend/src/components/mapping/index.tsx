'use client';

import {
  useState,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type Ref,
} from 'react';
import { Map } from 'react-map-gl/maplibre';
import { GeoJsonLayer } from '@deck.gl/layers';
import DeckGL from '@deck.gl/react';
import { FlyToInterpolator, LinearInterpolator } from '@deck.gl/core';
import { WebMercatorViewport } from '@math.gl/web-mercator';
import type { LayersList, MapViewState } from '@deck.gl/core';
import type { Feature, FeatureCollection } from 'geojson';
import type { StyleSpecification } from 'maplibre-gl';
import {
  Paper,
  Card,
  Divider,
  ActionIcon,
  Group,
  Stack,
  Text,
} from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { COLORS, FONTS } from '@/app/theme';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { MapRef } from 'react-map-gl/maplibre';
import {
  DetailSectionCard,
  detailSections,
  formatDetailValue,
  isBlank,
} from './FeatureDetails';

type RGBA = [number, number, number, number];

export interface MapLayerItem {
  id: string;
  geojson: FeatureCollection | null;
  visible: boolean;
  /** The tooltip fields that sum a feature up. When set, the hover tooltip
   *  shows only these — the rest is left for whatever a click opens. */
  summaryFields?: string[];
  /** Line under the hover tooltip saying what a click does. */
  hint?: string;
  /** false = drawn only: no hover, tooltip or click. Default true. */
  pickable?: boolean;
  /** false = clickable, but with no hover tooltip or highlight — for a
   *  backdrop that only exists to catch clicks. Default true. */
  hoverable?: boolean;
  /** Outline color and width (px). Default: a thin translucent white line. */
  lineColor?: RGBA;
  lineWidth?: number;
  /** Tint a hovered feature gets. Default: a white wash. */
  highlightColor?: RGBA;
}

/** What the user clicked: the feature, the layer it belongs to, and where. */
export type MapClick = {
  layerId: string;
  feature: Feature;
  coordinate: [number, number];
};

export type Basemap = 'light' | 'aerial';

export type FitPadding = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

/** Camera controls a parent can drive (e.g. from its own zoom buttons). */
export type VTMapHandle = {
  zoomBy: (delta: number) => void;
  /** Fly back to `targetBBox`. */
  refit: () => void;
};

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
  /** Fires on every map click, with what was hit (null for empty map). When
   *  given, showing the details is the caller's job — the map's own detail
   *  card stays closed. */
  onFeatureClick?: (click: MapClick | null) => void;
  /** Feature to ring in amber, e.g. the one whose details are open. */
  outlineFeature?: Feature | null;
  /** Screen space to keep clear when fitting to `targetBBox`, for panels
   *  that float over the map. */
  fitPadding?: FitPadding;
  basemap?: Basemap;
  ref?: Ref<VTMapHandle>;
}

const BASE_STYLES: Record<Basemap, string | StyleSpecification> = {
  light: 'https://tiles.basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  // USGS National Map aerial imagery with roads and place names: a public
  // U.S. government tile service, no API key. Tiles stop at zoom 16;
  // MapLibre stretches them past that.
  aerial: {
    version: 8,
    sources: {
      usgs: {
        type: 'raster',
        tiles: [
          'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 16,
        attribution: 'Imagery: U.S. Geological Survey',
      },
    },
    layers: [{ id: 'usgs', type: 'raster', source: 'usgs' }],
  },
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

const DEFAULT_FIT_PADDING: FitPadding = {
  top: 80,
  bottom: 80,
  left: 380,
  right: 80,
};

const DEFAULT_LINE_COLOR: RGBA = [255, 255, 255, 130];
// Property lines need to read as distinct boundaries at any zoom, even
// over an unfilled/light-colored parcel — the translucent-white outline
// every other (thematic-fill) layer uses is too subtle for that job. On
// aerial imagery it's the dark line that disappears, so that flips to white.
const PARCEL_LINE_COLOR: Record<Basemap, RGBA> = {
  light: [55, 65, 81, 220], // gray-700
  aerial: [255, 255, 255, 230],
};
const OUTLINE_COLOR: RGBA = [221, 154, 47, 255]; // COLORS.amber
const OUTLINE_HALO: RGBA = [255, 255, 255, 235];

type HoverInfo = {
  x: number;
  y: number;
  viewport?: { width: number; height: number };
  object?: { properties: { tooltip: Record<string, unknown> } };
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
  onFeatureHover,
  highlightId = null,
  onFeatureClick,
  outlineFeature = null,
  fitPadding = DEFAULT_FIT_PADDING,
  basemap = 'light',
  ref,
}: MyMapProps) {
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [viewState, setViewState] = useState<MapViewState>({
    ...INITIAL_VIEW_STATE,
    zoom: initialZoom,
  });

  // Camera transitions via WebMercatorViewport & FlyToInterpolator
  const fitTo = (bbox: [number, number, number, number]) => {
    const [west, south, east, north] = bbox;
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
        { padding: fitPadding },
      );

      setViewState((prev) => ({
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
  };

  // Refit only when the target changes — not when a panel opening or
  // closing changes the padding.
  useEffect(() => {
    if (targetBBox) fitTo(targetBBox);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetBBox]);

  useImperativeHandle(ref, () => ({
    zoomBy: (delta) =>
      setViewState((prev) => ({
        ...prev,
        zoom: clamp(
          prev.zoom + delta,
          VERMONT_BOUNDS.zoom.min,
          VERMONT_BOUNDS.zoom.max,
        ),
        transitionDuration: 250,
        transitionInterpolator: new LinearInterpolator(['zoom']),
      })),
    refit: () => {
      if (targetBBox) fitTo(targetBBox);
    },
  }));

  const activeLayers: MapLayerItem[] = layerConfigs ?? [
    ...(baseGeojson
      ? [{ id: 'base-geojson', geojson: baseGeojson, visible: true }]
      : []),
    ...(geojson ? [{ id: 'main-geojson', geojson, visible: true }] : []),
  ];

  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    // Map size at hover time, to keep the tooltip on screen.
    width: number;
    height: number;
    content: Record<string, unknown>;
    fields?: string[];
    hint?: string;
  } | null>(null);
  const [countylines, setCountylines] = useState<FeatureCollection | null>(
    null,
  );

  useEffect(() => {
    if (!showCountyLines) return;
    fetch('/data/municipalites.json')
      .then((res) => res.json())
      .then((raw) =>
        setCountylines({ type: 'FeatureCollection', features: raw.features }),
      )
      .catch(() => {});
  }, [showCountyLines]);

  const onViewStateChange = useCallback((params: { viewState: unknown }) => {
    const vs = params.viewState as MapViewState;
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

  const onHover = (info: HoverInfo, layer: MapLayerItem) => {
    if (info.object) {
      setTooltip({
        x: info.x,
        y: info.y,
        width: info.viewport?.width ?? Infinity,
        height: info.viewport?.height ?? Infinity,
        content: info.object.properties.tooltip,
        fields: layer.summaryFields,
        hint: layer.hint,
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
    coordinate?: number[];
    layer?: { id: string } | null;
    object?: Feature;
  }) => {
    if (!onFeatureClick) {
      setSelected(info.object?.properties?.tooltip ?? null);
      return;
    }
    onFeatureClick(
      info.object && info.layer && info.coordinate
        ? {
            layerId: info.layer.id.replace(/^layer-/, ''),
            feature: info.object,
            coordinate: [info.coordinate[0], info.coordinate[1]],
          }
        : null,
    );
  };

  const getFillColor = (d: { properties?: { rgba_color?: RGBA } }) =>
    d.properties?.rgba_color ?? [0, 0, 0, 0];

  const isHighlighted = (d: {
    properties?: { tooltip?: Record<string, unknown> };
  }) =>
    highlightId != null &&
    String(d.properties?.tooltip?.__title__ ?? '') === highlightId;

  const makeGetLineColor =
    (baseColor: RGBA) =>
    (d: { properties?: { tooltip?: Record<string, unknown> } }): RGBA =>
      isHighlighted(d) ? [255, 209, 0, 255] : baseColor;

  const makeGetLineWidth =
    (baseWidth: number) =>
    (d: { properties?: { tooltip?: Record<string, unknown> } }) =>
      isHighlighted(d) ? 3 : baseWidth;

  const deckLayers: LayersList = activeLayers
    .filter((layer) => layer.visible && layer.geojson)
    .map((layer) => {
      const lineColor =
        layer.lineColor ??
        (layer.id === 'parcels'
          ? PARCEL_LINE_COLOR[basemap]
          : DEFAULT_LINE_COLOR);
      const lineWidth = layer.lineWidth ?? 1;
      const pickable = layer.pickable ?? true;
      const hoverable = pickable && (layer.hoverable ?? true);
      return new GeoJsonLayer({
        id: `layer-${layer.id}`,
        data: layer.geojson!,
        filled: true,
        pointType: 'circle',
        pointRadiusUnits: 'pixels',
        pointRadiusMinPixels: 8,
        pointRadiusMaxPixels: 12,
        getFillColor,
        stroked: true,
        getLineColor: makeGetLineColor(lineColor),
        lineWidthUnits: 'pixels',
        getLineWidth: makeGetLineWidth(lineWidth),
        lineWidthMinPixels: 0.5,
        lineWidthMaxPixels: 3,
        updateTriggers: {
          getLineColor: [highlightId, lineColor.join()],
          getLineWidth: [highlightId, lineWidth],
        },
        pickable,
        autoHighlight: hoverable,
        highlightColor: layer.highlightColor ?? [255, 255, 255, 180],
        onHover: hoverable
          ? (info: HoverInfo) => onHover(info, layer)
          : undefined,
      });
    });

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

  if (outlineFeature) {
    // A white halo under the amber ring keeps it legible on any fill or
    // basemap.
    const ring = (id: string, color: RGBA, width: number) =>
      new GeoJsonLayer({
        id,
        data: outlineFeature,
        filled: false,
        stroked: true,
        pointType: 'circle',
        pointRadiusUnits: 'pixels',
        getPointRadius: 11,
        getLineColor: color,
        lineWidthUnits: 'pixels',
        getLineWidth: width,
      });
    deckLayers.push(
      ring('outline-halo', OUTLINE_HALO, 6),
      ring('outline', OUTLINE_COLOR, 3),
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
          getCursor={({ isDragging, isHovering }) =>
            isDragging ? 'grabbing' : isHovering ? 'pointer' : 'grab'
          }
          style={{ width: '100%', height: '100%' }}
        >
          <Map ref={mapRef} mapStyle={BASE_STYLES[basemap]} />
        </DeckGL>

        {tooltip && tooltip.content && (
          <Paper
            shadow="md"
            radius="md"
            p="sm"
            withBorder
            style={{
              position: 'absolute',
              // Open toward the middle of the map so it never runs off an edge.
              ...(tooltip.x > tooltip.width / 2
                ? { right: tooltip.width - tooltip.x + 12 }
                : { left: tooltip.x + 12 }),
              ...(tooltip.y > tooltip.height / 2
                ? { bottom: tooltip.height - tooltip.y + 12 }
                : { top: tooltip.y + 12 }),
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
            {(() => {
              const rows = (
                tooltip.fields ?? Object.keys(tooltip.content)
              ).filter(
                (k) => k !== '__title__' && !isBlank(tooltip.content[k]),
              );
              return (
                rows.length > 0 && (
                  <>
                    <Divider my={6} color={COLORS.line} />
                    <Stack gap={4}>
                      {rows.map((k) => (
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
                            {formatDetailValue(k, tooltip.content[k])}
                          </Text>
                        </Group>
                      ))}
                    </Stack>
                  </>
                )
              );
            })()}
            {tooltip.hint && (
              <Text size="xs" c="dimmed" mt={6}>
                {tooltip.hint}
              </Text>
            )}
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
              {detailSections(selected).map((section) => (
                <DetailSectionCard key={section.title} section={section} />
              ))}
            </Stack>
          </Card>
        )}
      </div>
    </div>
  );
}
