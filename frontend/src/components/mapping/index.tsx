'use client';

import { useState, useCallback, useEffect } from 'react';
import { Map } from 'react-map-gl/maplibre';
import { GeoJsonLayer } from '@deck.gl/layers';
import DeckGL from '@deck.gl/react';
import type { LayersList } from '@deck.gl/core';
import type { FeatureCollection } from 'geojson';
import { Paper, Divider } from '@mantine/core';
import 'maplibre-gl/dist/maplibre-gl.css';

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
}

const BASE_STYLES = {
  OSM: 'https://tiles.basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  Dark: 'https://tiles.basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
};

const VERMONT_BOUNDS = {
  latitude: { min: 42.7, max: 45.0 },
  longitude: { min: -73.5, max: -71.5 },
  zoom: { min: 7, max: 15 },
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
}: MyMapProps) {
  // Normalize layers array to support both `layers` array and legacy single `geojson`/`baseGeojson` props
  const activeLayers: MapLayerItem[] = layerConfigs ?? [
    ...(baseGeojson
      ? [{ id: 'base-geojson', geojson: baseGeojson, visible: true }]
      : []),
    ...(geojson ? [{ id: 'main-geojson', geojson, visible: true }] : []),
  ];

  const [viewState, setViewState] = useState({
    ...INITIAL_VIEW_STATE,
    zoom: initialZoom,
  });
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

  const onViewStateChange = useCallback((params: { viewState: unknown }) => {
    const vs = params.viewState as typeof INITIAL_VIEW_STATE;
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
    } else {
      setTooltip(null);
    }
  };

  const getFillColor = (d: {
    properties?: { rgba_color?: [number, number, number, number] };
  }) => d.properties?.rgba_color ?? [0, 0, 0, 0];

  // Map activeLayers into deck.gl layers
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
          getLineColor: [120, 120, 120, 150],
          lineWidthMinPixels: 1,
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
          style={{ width: '100%', height: '100%' }}
        >
          <Map mapStyle={baseStyle} />
        </DeckGL>

        {tooltip && tooltip.content && (
          <Paper
            shadow="md"
            p="xs"
            style={{
              position: 'absolute',
              left: tooltip.x + 12,
              top: tooltip.y + 12,
              pointerEvents: 'none',
              zIndex: 1000,
              maxWidth: 280,
            }}
          >
            <strong>{String(tooltip.content.__title__ ?? 'Details')}</strong>
            <Divider my={4} />
            {Object.entries(tooltip.content).map(
              ([k, v]) =>
                k !== '__title__' && (
                  <div key={k} style={{ fontSize: 12 }}>
                    <b>{k}:</b> {String(v)}
                  </div>
                ),
            )}
          </Paper>
        )}
      </div>
    </div>
  );
}
