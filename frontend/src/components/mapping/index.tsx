'use client';

// react
import { useState, useCallback, useEffect } from 'react';
import { Map, ViewStateChangeEvent } from 'react-map-gl/maplibre';

// deck, geojson, and maplibre styling
import { GeoJsonLayer } from '@deck.gl/layers';
import DeckGL from '@deck.gl/react';
import type { FeatureCollection } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';

// mantine and ui
import { Paper, Divider } from '@mantine/core';

interface MyMapProps {
  geojson: FeatureCollection | null;
  showCountyLines: boolean;
}

const BASE_STYLES = {
  OSM: 'https://tiles.basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  Dark: 'https://tiles.basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
};

const VERMONT_BOUNDS = {
  latitude: { min: 42.7, max: 45.0 },
  longitude: { min: -73.5, max: -71.5 },
  zoom: { min: 7, max: 11 },
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

export default function VTMap({ geojson, showCountyLines }: MyMapProps) {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [baseStyle] = useState(BASE_STYLES.OSM);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: any;
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

  const onViewStateChange = useCallback((params: any) => {
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

  const layers = [
    geojson &&
      new GeoJsonLayer({
        id: 'geojson',
        data: geojson,
        filled: true,
        getFillColor: (d: any) => d.properties?.rgba_color ?? [0, 0, 0, 0],
        getLineColor: [80, 80, 80, 80],
        lineWidthMinPixels: 0.5,
        pickable: true,
        autoHighlight: true,
        highlightColor: [222, 102, 0, 200],
        onHover: (info: any) => {
          if (info.object) {
            setTooltip({
              x: info.x,
              y: info.y,
              content: info.object.properties.tooltip,
            });
          } else {
            setTooltip(null);
          }
        },
      }),
    showCountyLines &&
      countylines &&
      new GeoJsonLayer({
        id: 'county-lines',
        data: countylines,
        filled: false,
        stroked: true,
        getLineColor: [80, 80, 80, 200],
        lineWidthMinPixels: 1,
      }),
  ].filter(Boolean);

  return (
    // Fill the parent container completely (parent must have position:relative and a defined height)
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
      }}
    >
      {/* Map area — fills remaining height, clips overflow */}
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
          controller
          layers={layers}
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
            <strong>{tooltip.content.__title__}</strong>
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
