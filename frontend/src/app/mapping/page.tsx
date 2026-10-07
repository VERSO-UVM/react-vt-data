'use client';

import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  Suspense,
} from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import type { Feature, FeatureCollection } from 'geojson';
import { Autocomplete } from '@mantine/core';
import {
  IconChevronRight,
  IconHandClick,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconSearch,
} from '@tabler/icons-react';
import { area } from '@turf/area';
import { AnimatePresence, motion } from 'motion/react';

import VTMap, {
  type Basemap,
  type MapClick,
  type MapLayerItem,
  type VTMapHandle,
} from '@/components/mapping';
import LayerPanel from './LayerPanel';
import QuestionList from './QuestionList';
import SpotCard from './SpotCard';
import { InsightStrip, MapControls, MapKey } from './MapOverlays';
import type { LayerStats } from './UseMapLayer';
import { MAP_LAYERS, UNZONED_URL } from '@/app/mapping/MapLayers';
import { MAP_PRESETS, type MapPreset } from '@/app/mapping/MapPresets';
import { jurisdictionCandidates } from './jurisdictionMatch';
import {
  acresInside,
  computeBuildableOverlay,
  withParcelBuildability,
  type PolyFeature,
} from './buildableOverlay';
import type { ParcelColorMode, RGBA } from './layerColors';
import {
  buildInsights,
  buildMapKey,
  spotReport,
  type TownMapState,
} from './townInsights';
import { townNames } from './townNames';
import type { FilterSpec } from '@/components/FilterRedux/filterTypes';
import { useMunicipalities, MunicipalityFeature } from './useMunicipalities';
import { getFeatureBBox } from './geoUtils';
import { COLORS } from '@/app/theme';
import styles from './explorer.module.css';

const ACRES_PER_SQM = 1 / 4046.8564224;
const BUILDABLE_PRESET_ID = 'buildable-areas';
const VERMONT_BBOX: [number, number, number, number] = [
  -73.44, 42.72, -71.46, 45.02,
];
// Shortcuts on the welcome card, by Census name.
const POPULAR_TOWNS = [
  'Burlington city',
  'Montpelier city',
  'Stowe town',
  'Brattleboro town',
  'Rutland city',
  'Middlebury town',
  'St. Johnsbury town',
  'Bennington town',
];

// How town boundaries are drawn. With no town chosen every town gets a
// faint wash, so Vermont reads as one shape; once one is chosen its
// neighbors fade back and it gets a solid outline.
const TOWN_LINE: RGBA = [27, 58, 47, 90];
const TOWN_TINT: RGBA = [27, 58, 47, 12];
const TOWN_FADE: RGBA = [246, 245, 239, 150];
const TOWN_HOVER: RGBA = [27, 58, 47, 55];
const TOWN_OUTLINE: RGBA = [27, 58, 47, 255];
const INVISIBLE: RGBA = [255, 255, 255, 1];
const NO_LINE: RGBA = [0, 0, 0, 0];

// The explorer's CSS reads its palette and fonts from these, so the brand
// colors keep one home (app/theme.ts).
const TOKENS = {
  '--spruce': COLORS.spruce,
  '--slate': COLORS.slate,
  '--birch': COLORS.birch,
  '--ink': COLORS.ink,
  '--red': COLORS.red,
  '--line': COLORS.line,
  '--ui': "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  '--display': 'var(--font-zilla-slab), Georgia, serif',
} as CSSProperties;

/** Sizes the explorer to exactly the viewport below the site header,
 *  whatever height the header happens to be. */
function fillViewportBelow(el: HTMLDivElement | null) {
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY;
  el.style.height = `calc(100dvh - ${top}px)`;
}

function SectionLabel({
  children,
  aside,
}: {
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className={styles.sectionLabel}>
      <span className={styles.eyebrow}>{children}</span>
      {aside}
    </div>
  );
}

export default function MapExplorerPage() {
  return (
    <Suspense fallback={null}>
      <MapExplorerContent />
    </Suspense>
  );
}

function MapExplorerContent() {
  const searchParams = useSearchParams();
  const mapRef = useRef<VTMapHandle>(null);

  // Layout & Municipality State
  const [panelOpen, setPanelOpen] = useState(true);
  const [basemap, setBasemap] = useState<Basemap>('light');
  const [searchValue, setSearchValue] = useState('');
  const [selectedBBox, setSelectedBBox] = useState<
    [number, number, number, number] | null
  >(null);
  // The clicked spot whose details are open.
  const [selection, setSelection] = useState<MapClick | null>(null);

  const { data: municipalities } = useMunicipalities();

  const [activeLayers, setActiveLayers] = useState<Set<string>>(() => {
    const initial = searchParams.get('layer');
    return initial && MAP_LAYERS.some((l) => l.id === initial)
      ? new Set([initial])
      : new Set();
  });

  const [layerData, setLayerData] = useState<
    Record<string, FeatureCollection | null>
  >({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  // Zoning's server-computed area stats — see LayerStats.
  const [zoningStats, setZoningStats] = useState<LayerStats | null>(null);
  const [presetFilters, setPresetFilters] = useState<
    Record<string, FilterSpec[]>
  >({});
  // Bumped whenever a preset is (re)selected or the selected town changes,
  // so active layers re-fetch scoped to the new preset/town.
  const [scopeVersion, setScopeVersion] = useState(0);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [parcelColorMode, setParcelColorMode] =
    useState<ParcelColorMode>('category');
  const [unzoned, setUnzoned] = useState<FeatureCollection | null>(null);

  // Gate: no layer data loads until a town is selected. Statewide layers
  // (soil suitability alone is ~180k polygons) are too much to fetch and
  // render at once, so every layer fetch is scoped to this town instead.
  const [selectedTown, setSelectedTown] = useState<MunicipalityFeature | null>(
    null,
  );
  const townCandidates = useMemo(
    () =>
      selectedTown
        ? jurisdictionCandidates(selectedTown.properties.NAME)
        : null,
    [selectedTown],
  );

  useEffect(() => {
    axios
      .get(UNZONED_URL)
      .then((res) => setUnzoned(res.data))
      .catch((e) => console.error('unzoned layer fetch failed', e));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelection(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // The unzoned backdrop is fetched statewide (it's small — a few hundred
  // features), but each feature's tooltip title is the exact TIGER town
  // name it belongs to, so it can be scoped to the selected town with an
  // exact match — no fuzzy jurisdiction matching needed here.
  const unzonedForTown = useMemo(() => {
    if (!selectedTown || !unzoned) return null;
    const townName = selectedTown.properties.NAME;
    return {
      ...unzoned,
      features: unzoned.features.filter(
        (f) => f.properties?.tooltip?.__title__ === townName,
      ),
    };
  }, [unzoned, selectedTown]);

  // Display names, and the search box's options, for every municipality.
  const { names, options, byOption } = useMemo(() => {
    const features = municipalities?.features ?? [];
    const names = townNames(features.map((f) => f.properties.NAME));
    const byOption = new Map<string, MunicipalityFeature>();
    for (const f of features) {
      byOption.set(names.get(f.properties.NAME)!.option, f);
    }
    return {
      names,
      byOption,
      options: [...byOption.keys()].sort((a, b) => a.localeCompare(b)),
    };
  }, [municipalities]);

  const selectedName = selectedTown
    ? names.get(selectedTown.properties.NAME)
    : undefined;
  const townName = selectedName?.name ?? '';

  const selectTown = useCallback((town: MunicipalityFeature) => {
    const bbox = getFeatureBBox(town.geometry);
    // Ensure bbox is valid before setting
    if (bbox[0] !== 0 || bbox[1] !== 0) setSelectedBBox(bbox);
    // Selecting a (new) town rescopes every active layer's data to it —
    // stale data from the previous town shouldn't linger on screen
    // while the rescoped fetch is in flight.
    setSelectedTown(town);
    setLayerData({});
    setZoningStats(null);
    setScopeVersion((v) => v + 1);
    setSelection(null);
    setSearchValue('');
  }, []);

  const clearTown = () => {
    setSelectedTown(null);
    setSelectedBBox(null);
    setLayerData({});
    setLoadingIds(new Set());
    setZoningStats(null);
    setSelection(null);
  };

  // Picking an option puts its exact label in the box; that is the cue to
  // select the town and clear the box for the next search.
  const handleSearchChange = (value: string) => {
    const town = byOption.get(value);
    if (town) selectTown(town);
    else setSearchValue(value);
  };

  // Enter takes the best match for whatever has been typed so far.
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const query = searchValue.trim().toLowerCase();
    if (e.key !== 'Enter' || !query) return;
    const match =
      options.find((o) => o.toLowerCase().startsWith(query)) ??
      options.find((o) => o.toLowerCase().includes(query));
    if (match) selectTown(byOption.get(match)!);
  };

  const handleToggle = useCallback((id: string, active: boolean) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (active) next.add(id);
      else next.delete(id);
      return next;
    });
    if (!active) {
      setLayerData((prev) => ({ ...prev, [id]: null }));
      if (id === 'zoning') setZoningStats(null);
      setSelection((prev) => (prev?.layerId === id ? null : prev));
    }
    // Adding a layer on top of a question keeps the question; taking away
    // one of the question's own layers means the map no longer answers it.
    setActivePresetId((current) => {
      const preset = MAP_PRESETS.find((p) => p.id === current);
      return preset && (active || !preset.layers.includes(id)) ? current : null;
    });
  }, []);

  const handlePresetSelect = useCallback((preset: MapPreset) => {
    setActiveLayers(new Set(preset.layers));
    setPresetFilters(preset.filters ?? {});
    setScopeVersion((v) => v + 1);
    setActivePresetId(preset.id);
    setSelection(null);
  }, []);

  const handlePresetClear = useCallback(() => {
    setActiveLayers(new Set());
    setLayerData({});
    setZoningStats(null);
    setPresetFilters({});
    setActivePresetId(null);
    setSelection(null);
  }, []);

  // While a preset is active, its layers' filters are locked — changing
  // them would silently redefine what "Buildable Areas" means without the
  // user realizing it. Toggling a layer off (which exits preset mode via
  // handleToggle) is still allowed; only in-place filter edits are blocked.
  const lockedLayerIds = useMemo(
    () =>
      activePresetId ? new Set(Object.keys(presetFilters)) : new Set<string>(),
    [activePresetId, presetFilters],
  );

  const handleDataChange = useCallback(
    (id: string, geojson: FeatureCollection | null) => {
      setLayerData((prev) => ({ ...prev, [id]: geojson }));
    },
    [],
  );

  const handleStatsChange = useCallback(
    (id: string, stats: LayerStats | null) => {
      if (id === 'zoning') setZoningStats(stats);
    },
    [],
  );

  const handleLoadingChange = useCallback((id: string, loading: boolean) => {
    setLoadingIds((prev) => {
      if (prev.has(id) === loading) return prev;
      const next = new Set(prev);
      if (loading) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  // Whenever both zoning and soil-suitability layers are active,
  // replace polygons with one derived "buildable" shape (permitted zoning ∩ suited
  // soil, minus flood) instead.
  const bothZoningAndSoilActive =
    activeLayers.has('zoning') && activeLayers.has('soil-suitability');
  // The layers that shape stands in for, so aren't drawn on their own.
  const combinedLayerIds = useMemo(
    () =>
      new Set(bothZoningAndSoilActive ? ['zoning', 'soil-suitability'] : []),
    [bothZoningAndSoilActive],
  );
  // The shape only means "buildable" under the preset's filters; any other
  // zoning + soil combination is just where the two layers overlap.
  const buildablePreset = activePresetId === BUILDABLE_PRESET_ID;

  const buildableOverlay = useMemo(() => {
    if (!bothZoningAndSoilActive) return null;
    return computeBuildableOverlay(
      layerData['zoning'],
      layerData['soil-suitability'],
      activeLayers.has('flood-legal') ? layerData['flood-legal'] : null,
      buildablePreset ? 'Buildable land' : 'Zoning and soil overlap',
    );
  }, [bothZoningAndSoilActive, layerData, activeLayers, buildablePreset]);

  // Gated on both being active so the per-parcel turf.intersect pass (a few
  // thousand clips against the dissolved buildable polygon, worst case)
  // never runs for users who haven't combined Parcels with zoning+soil.
  const parcelsWithBuildability = useMemo(() => {
    if (!activeLayers.has('parcels') || !buildableOverlay) {
      return layerData['parcels'] ?? null;
    }
    return withParcelBuildability(
      layerData['parcels'] ?? null,
      buildableOverlay.geojson.features[0] as PolyFeature,
    );
  }, [activeLayers, buildableOverlay, layerData]);

  // ----- What the map says, in numbers ---------------------------------

  const townShape = selectedTown as unknown as PolyFeature | null;
  const townAcres = useMemo(
    () => (townShape ? area(townShape) * ACRES_PER_SQM : null),
    [townShape],
  );
  // Each depends on its own layer's data only, so the union behind it
  // doesn't rerun when an unrelated layer changes.
  const floodData = activeLayers.has('flood-legal')
    ? layerData['flood-legal']
    : null;
  const sewerData = activeLayers.has('service-areas')
    ? layerData['service-areas']
    : null;
  const floodAcres = useMemo(
    () => acresInside(floodData, townShape),
    [floodData, townShape],
  );
  const sewerAcres = useMemo(
    () => acresInside(sewerData, townShape),
    [sewerData, townShape],
  );

  const mapState: TownMapState = useMemo(
    () => ({
      townName,
      townAcres,
      active: activeLayers,
      data: layerData,
      combined: bothZoningAndSoilActive,
      overlay: buildableOverlay,
      buildablePreset,
      zoningStats,
      townCandidates,
      floodAcres,
      sewerAcres,
      parcelMode: parcelColorMode,
      unzoned: unzonedForTown,
    }),
    [
      townName,
      townAcres,
      activeLayers,
      layerData,
      bothZoningAndSoilActive,
      buildableOverlay,
      buildablePreset,
      zoningStats,
      townCandidates,
      floodAcres,
      sewerAcres,
      parcelColorMode,
      unzonedForTown,
    ],
  );
  const insights = useMemo(() => buildInsights(mapState), [mapState]);
  const keyGroups = useMemo(() => buildMapKey(mapState), [mapState]);
  const report = useMemo(
    () => (selection ? spotReport(mapState, selection.coordinate) : []),
    [mapState, selection],
  );
  const loadingTitles = MAP_LAYERS.filter((l) => loadingIds.has(l.id)).map(
    (l) => l.title,
  );

  // ----- What the map draws --------------------------------------------

  // Every town but the selected one: clickable, to pick or switch towns.
  const otherTowns = useMemo((): FeatureCollection | null => {
    if (!municipalities) return null;
    return {
      type: 'FeatureCollection',
      features: municipalities.features
        .filter((f) => f !== selectedTown)
        .map((f) => {
          const name = names.get(f.properties.NAME);
          return {
            ...f,
            properties: {
              ...f.properties,
              rgba_color: selectedTown ? TOWN_FADE : TOWN_TINT,
              tooltip: { __title__: name?.name, County: name?.county },
            },
          };
        }),
    };
  }, [municipalities, selectedTown, names]);

  const townArea = useMemo((): FeatureCollection | null => {
    if (!selectedTown) return null;
    return {
      type: 'FeatureCollection',
      features: [
        {
          ...selectedTown,
          properties: { ...selectedTown.properties, rgba_color: INVISIBLE },
        },
      ],
    };
  }, [selectedTown]);

  const mapLayers: MapLayerItem[] = [];
  // An invisible backdrop over the whole town, so a click anywhere in it —
  // not only on a drawn feature — opens the spot card.
  if (townArea) {
    mapLayers.push({
      id: 'town-area',
      geojson: townArea,
      visible: true,
      hoverable: false,
      lineColor: NO_LINE,
    });
  }
  if (activeLayers.has('zoning') && unzonedForTown) {
    mapLayers.push({
      id: 'zoning-base',
      geojson: unzonedForTown,
      visible: true,
    });
  }
  for (const cfg of MAP_LAYERS) {
    const suppressed = combinedLayerIds.has(cfg.id);
    mapLayers.push({
      id: cfg.id,
      geojson: suppressed
        ? null
        : cfg.id === 'parcels'
          ? parcelsWithBuildability
          : (layerData[cfg.id] ?? null),
      visible: !suppressed && activeLayers.has(cfg.id),
      summaryFields: cfg.summaryFields,
      hint: 'Click for details',
    });
  }
  if (buildableOverlay) {
    mapLayers.push({
      id: 'buildable-overlay',
      geojson: buildableOverlay.geojson,
      visible: true,
      summaryFields: ['Acreage'],
      hint: 'Click for details',
    });
  }
  if (otherTowns) {
    mapLayers.push({
      id: 'towns',
      geojson: otherTowns,
      visible: true,
      summaryFields: ['County'],
      hint: selectedTown
        ? 'Click to switch to this town'
        : 'Click to explore this town',
      lineColor: TOWN_LINE,
      highlightColor: TOWN_HOVER,
    });
  }
  if (townArea) {
    mapLayers.push({
      id: 'town-outline',
      geojson: townArea,
      visible: true,
      pickable: false,
      lineColor: TOWN_OUTLINE,
      lineWidth: 2.5,
    });
  }

  const handleMapClick = (click: MapClick | null) => {
    if (click?.layerId === 'towns') {
      const town = municipalities?.features.find(
        (f) => f.properties.GEOID === click.feature.properties?.GEOID,
      );
      if (town) selectTown(town);
      return;
    }
    setSelection(click);
  };

  // Ring the clicked feature — or, where the click landed on a shape too
  // big to mean "here" (the whole town, the buildable area), the spot.
  const outline = useMemo((): Feature | null => {
    if (!selection) return null;
    if (MAP_LAYERS.some((l) => l.id === selection.layerId)) {
      return selection.feature;
    }
    return {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: selection.coordinate },
    };
  }, [selection]);

  const search = (
    <Autocomplete
      aria-label="Search for a Vermont town or city"
      placeholder={
        selectedTown ? 'Search another town…' : 'Search a town or city…'
      }
      leftSection={<IconSearch size={18} color={COLORS.spruce} />}
      data={options}
      value={searchValue}
      onChange={handleSearchChange}
      onKeyDown={handleSearchKeyDown}
      limit={8}
      size={selectedTown ? 'sm' : 'md'}
      radius="md"
      autoFocus={!selectedTown}
      comboboxProps={{ shadow: 'lg', radius: 'md' }}
      classNames={{ dropdown: styles.portal }}
      style={{ flex: 1 }}
    />
  );

  return (
    <div
      ref={fillViewportBelow}
      className={styles.root}
      style={{ ...TOKENS, height: 'calc(100dvh - 70px)' }}
    >
      <div className={styles.map}>
        <VTMap
          ref={mapRef}
          layers={mapLayers}
          showCountyLines={false}
          targetBBox={selectedBBox ?? VERMONT_BBOX}
          fitPadding={{
            top: 120,
            bottom: 56,
            left: panelOpen ? 440 : 64,
            right: 64,
          }}
          basemap={basemap}
          onFeatureClick={handleMapClick}
          outlineFeature={outline}
        />
      </div>

      <div className={styles.overlay}>
        {!panelOpen && (
          <button
            type="button"
            className={styles.reopen}
            onClick={() => setPanelOpen(true)}
          >
            <IconLayoutSidebarLeftExpand size={18} />
            {selectedTown ? townName : 'Choose a town'}
          </button>
        )}

        {/* Hidden, never unmounted, when collapsed: the layer rows inside
            own each layer's data. */}
        <aside
          className={styles.panel}
          data-collapsed={!panelOpen || undefined}
          aria-label="Map explorer"
        >
          <div className={styles.panelHead}>
            {!selectedTown && (
              <>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <span className={styles.eyebrow}>Map explorer · Beta</span>
                  <CollapseButton onClick={() => setPanelOpen(false)} />
                </div>
                <h1 className={styles.heroTitle}>
                  Explore Vermont,
                  <br />
                  town by town.
                </h1>
                <p className={styles.lede}>
                  Zoning, flood zones, soils, sewer service and property lines —
                  together on one map, in plain language.
                </p>
              </>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {search}
              {selectedTown && (
                <CollapseButton onClick={() => setPanelOpen(false)} />
              )}
            </div>

            {!selectedTown && municipalities && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  marginTop: 12,
                }}
              >
                {POPULAR_TOWNS.map((raw) => {
                  const town = municipalities.features.find((f) =>
                    f.properties.NAME.startsWith(`${raw},`),
                  );
                  return (
                    town && (
                      <button
                        key={raw}
                        type="button"
                        className={styles.chip}
                        onClick={() => selectTown(town)}
                      >
                        {names.get(town.properties.NAME)?.name}
                      </button>
                    )
                  );
                })}
              </div>
            )}

            {selectedTown && (
              <>
                <div className={styles.crumbs}>
                  <button
                    type="button"
                    className={styles.crumbLink}
                    onClick={clearTown}
                  >
                    All of Vermont
                  </button>
                  <IconChevronRight size={13} />
                  {selectedName?.county}
                  {selectedName?.kind && ` · ${selectedName.kind}`}
                </div>
                <h1 className={styles.townTitle}>{townName}</h1>
              </>
            )}
          </div>

          <div className={styles.panelBody}>
            {!selectedTown ? (
              <ol className={styles.steps}>
                <li>
                  <span>
                    <b>Pick a town.</b>
                    Search above, or click one on the map.
                  </span>
                </li>
                <li>
                  <span>
                    <b>Ask a question.</b>
                    Like “Where could housing be built?”
                  </span>
                </li>
                <li>
                  <span>
                    <b>Click the map.</b>
                    See what applies at any spot, in one card.
                  </span>
                </li>
              </ol>
            ) : (
              <>
                <SectionLabel>Start with a question</SectionLabel>
                <QuestionList
                  activeId={activePresetId}
                  onSelect={handlePresetSelect}
                  onClear={handlePresetClear}
                />

                <SectionLabel
                  aside={
                    activeLayers.size > 0 && (
                      <button
                        type="button"
                        className={styles.linkButton}
                        onClick={handlePresetClear}
                      >
                        Clear the map
                      </button>
                    )
                  }
                >
                  Or choose what to show
                </SectionLabel>
                <LayerPanel
                  activeLayers={activeLayers}
                  onToggle={handleToggle}
                  onDataChange={handleDataChange}
                  onStatsChange={handleStatsChange}
                  onLoadingChange={handleLoadingChange}
                  presetFilters={presetFilters}
                  lockedLayerIds={lockedLayerIds}
                  combinedLayerIds={combinedLayerIds}
                  townCandidates={townCandidates}
                  townBBox={selectedBBox}
                  townName={townName}
                  scopeVersion={scopeVersion}
                  parcelColorMode={parcelColorMode}
                  onParcelColorMode={setParcelColorMode}
                />
              </>
            )}
          </div>
        </aside>

        <div className={styles.middle}>
          <div className={styles.top}>
            {!selectedTown && (
              <div className={styles.pill}>
                <IconHandClick size={16} />
                Click any town on the map to begin
              </div>
            )}
            {selectedTown && activeLayers.size === 0 && (
              <div className={styles.pill}>
                Pick a question on the left to see it on the map
              </div>
            )}
            {selectedTown && (
              <InsightStrip insights={insights} loading={loadingTitles} />
            )}
          </div>

          <div className={styles.bottom}>
            <MapKey groups={keyGroups} />
            <MapControls
              basemap={basemap}
              onBasemap={setBasemap}
              onZoom={(delta) => mapRef.current?.zoomBy(delta)}
              onRefit={() => mapRef.current?.refit()}
            />
          </div>
        </div>

        <AnimatePresence>
          {selection && (
            <motion.div
              key="spot"
              style={{ display: 'flex', flexShrink: 0 }}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.2 }}
            >
              <SpotCard
                click={selection}
                report={report}
                townName={townName}
                onShowLayer={(id) => handleToggle(id, true)}
                onClose={() => setSelection(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function CollapseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className={styles.linkButton}
      aria-label="Hide this panel"
      title="Hide this panel"
      onClick={onClick}
      style={{ display: 'grid', placeItems: 'center', color: COLORS.slate }}
    >
      <IconLayoutSidebarLeftCollapse size={20} />
    </button>
  );
}
