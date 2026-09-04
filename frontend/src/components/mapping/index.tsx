'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Map } from 'react-map-gl/maplibre';
import { GeoJsonLayer } from '@deck.gl/layers';
import DeckGL from '@deck.gl/react';
import { FlyToInterpolator } from '@deck.gl/core';
import { WebMercatorViewport } from '@math.gl/web-mercator';
import type { LayersList } from '@deck.gl/core';
import type { FeatureCollection } from 'geojson';
import { Paper, Divider } from '@mantine/core';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { MapRef } from 'react-map-gl/maplibre';

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
  targetBBox,
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
    } else {
      setTooltip(null);
    }
  };

  const getFillColor = (d: {
    properties?: { rgba_color?: [number, number, number, number] };
  }) => d.properties?.rgba_color ?? [0, 0, 0, 0];

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
          getLineColor: [255, 255, 255, 130],
          lineWidthUnits: 'pixels',
          getLineWidth: 1,
          lineWidthMinPixels: 0.5,
          lineWidthMaxPixels: 1,
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
          style={{ width: '100%', height: '100%' }}
        >
          <Map ref={mapRef} mapStyle={baseStyle} />
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
