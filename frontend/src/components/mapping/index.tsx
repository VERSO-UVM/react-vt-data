'use client';

// react
import { useState, useCallback } from 'react';
import { Map, ViewState, ViewStateChangeEvent } from 'react-map-gl/maplibre';

// deck, geojson, and mablibre styling
import { GeoJsonLayer } from '@deck.gl/layers';
import DeckGL from '@deck.gl/react';
import type { FeatureCollection } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';

// mantine and ui
import { Paper, Switch, Card, Button, Divider } from '@mantine/core';

// baseline data
import mlinesRaw from '@/Data/municipalites.json';

const countylines: FeatureCollection = {
  type: 'FeatureCollection',
  features: mlinesRaw.features,
};
interface MyMapProps {
  geojson: FeatureCollection;
}

const BASE_STYLES = {
  OSM: 'https://tiles.basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  Dark: 'https://tiles.basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  Satellite: 'https://api.maptiler.com/maps/hybrid/style.json?key=YOUR_KEY',
};

const VERMONT_BOUNDS = {
  latitude: { min: 42.7, max: 45.0 },
  longitude: { min: -73.5, max: -71.5 },
  zoom: { min: 7, max: 11 },
};

const INITIAL_VIEW_STATE: ViewState = {
  longitude: -72.7,
  latitude: 43.9,
  zoom: 7,
  pitch: 0,
  bearing: 0,
  padding: { top: 0, bottom: 0, left: 0, right: 0 },
};

export default function VTMap({ geojson }: MyMapProps) {
  // At some point we are going to want to add multiple layer functionality to this.
  // The tooltip use_state will have to be dynamically
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [baseStyle, setBaseStyle] = useState(BASE_STYLES.OSM);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    content: any;
  } | null>(null);
  const [showCountyLines, setShowCountyLines] = useState(true);

  function clamp(value: number, minValue: number, maxValue: number) {
    return Math.max(minValue, Math.min(maxValue, value));
  }

  const onViewStateChange = useCallback(
    ({ viewState }: ViewStateChangeEvent) => {
      setViewState({
        ...viewState,
        zoom: clamp(
          viewState.zoom,
          VERMONT_BOUNDS.zoom.min,
          VERMONT_BOUNDS.zoom.max,
        ),
        latitude: clamp(
          viewState.latitude,
          VERMONT_BOUNDS.latitude.min,
          VERMONT_BOUNDS.latitude.max,
        ),
        longitude: clamp(
          viewState.longitude,
          VERMONT_BOUNDS.longitude.min,
          VERMONT_BOUNDS.longitude.max,
        ),
      });
    },
    [],
  );
  const layers = [
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
      onHover: (info) => {
        if (info.object) {
          setTooltip({
            x: info.x,
            y: info.y,
            content: info.object.properties.tooltip, // this is an object
          });
        } else {
          setTooltip(null);
        }
      },
    }),
    showCountyLines &&
      new GeoJsonLayer({
        id: 'county-lines',
        data: countylines,
        filled: false,
        stroked: true,
        getLineColor: [80, 80, 80, 200],
        lineWidthMinPixels: 1,
      }),
  ].filter(Boolean); // removes false layesr

  return (
    <>
      <Card shadow="sm" p="md">
        <Switch
          label="Show County Lines"
          checked={showCountyLines}
          onChange={(event) => setShowCountyLines(event.currentTarget.checked)}
        />
      </Card>

      <div style={{ position: 'relative' }}>
        <DeckGL
          initialViewState={INITIAL_VIEW_STATE}
          viewState={viewState}
          onViewStateChange={onViewStateChange}
          controller
          layers={layers}
          style={{ width: '80vw', height: '80vh' }}
        >
          <Map mapStyle={baseStyle} />
        </DeckGL>

        {tooltip && (
          <Paper
            shadow="md"
            p="xs"
            style={{
              position: 'absolute',
              left: tooltip.x,
              top: tooltip.y,
              pointerEvents: 'none',
              zIndex: 1000,
            }}
          >
            <strong>{tooltip.content.__title__}</strong>
            <Divider />
            {Object.entries(tooltip.content).map(
              ([k, v]) =>
                k !== '__title__' && (
                  <div key={k}>
                    <b>{k}:</b> {v}
                  </div>
                ),
            )}
          </Paper>
        )}
      </div>
    </>
  );
}
