'use client';
import { Select, Paper, Text, SegmentedControl, Loader } from '@mantine/core';
import { useEffect, useState } from 'react';
import axios from 'axios';
import type { FeatureCollection } from 'geojson';
import { BASE_API_URL } from '@/config';
import { COLORS, FONTS } from '@/app/theme';
import VTMap from '@/components/mapping';
import VariableScatter from '@/components/Charts/MapCorrespondentScatter';
import { FilterWrap } from '@/components/FilterRedux/filterWrap';
import { assemble } from '@/components/FilterRedux/apiHelpers';
import { postRequest } from '@/components/FilterRedux/filterRequest';
import { FilterSpec, filterDef } from '@/components/FilterRedux/filterTypes';
import QuadTileMapLayout from '@/components/QuadTileMapLayout';
import { ChartItem } from '@/types/cachedCharts';
import { SamePerXBarChart } from '@/components/Charts';

type Legend = {
  grid: number[][][];
  measures: [string, string];
  edges_x: number[];
  edges_y: number[];
};

type DatasetInfo = {
  label: string;
  filter_table: string;
  levels: string[];
};

type DatasetRegistry = Record<string, DatasetInfo>;

const LEVEL_LABELS: Record<string, string> = {
  county: 'County',
  town: 'Town',
  tract: 'Census Tract',
};

const CELL = 34;
const GAP = 2;
const SIZE = 3 * CELL + 2 * GAP;
const CUTS = [1, 2].map((i) => i * CELL + (i - 0.5) * GAP);

const rgba = (c: number[]) => `rgba(${c[0]},${c[1]},${c[2]},${c[3] / 255})`;
const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

// 3 X 3 bivariate legend.
function BivariateLegend({ legend }: { legend: Legend }) {
  const { grid, measures, edges_x, edges_y } = legend;
  const cutX = edges_x.slice(1, -1);
  const cutY = edges_y.slice(1, -1);

  return (
    <Paper
      withBorder
      p="sm"
      radius="md"
      mt="md"
      style={{ borderColor: COLORS.line, backgroundColor: COLORS.birch }}
    >
      <Text size="xs" c="dimmed" mb={8}>
        Regions are shaded by both variables at once — darker means higher on
        both.
      </Text>
      <Text size="xs" fw={500} title={measures[1]} lineClamp={2} mb={4}>
        ↑ {measures[1]}
      </Text>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        <div style={{ position: 'relative', width: 26, height: SIZE }}>
          {cutY.map((v, i) => (
            <Text
              key={i}
              size="10px"
              c="dimmed"
              style={{
                position: 'absolute',
                right: 0,
                top: SIZE - CUTS[i],
                transform: 'translateY(-50%)',
              }}
            >
              {fmt(v)}
            </Text>
          ))}
        </div>

        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(3, ${CELL}px)`,
              gap: GAP,
              borderRadius: 4,
              overflow: 'hidden',
              width: SIZE,
            }}
          >
            {[2, 1, 0].map((y) =>
              [0, 1, 2].map((x) => (
                <div
                  key={`${x}-${y}`}
                  style={{
                    width: CELL,
                    height: CELL,
                    backgroundColor: rgba(grid[y][x]),
                    // hairline ring so the lightest (low/low) cell still reads
                    // as a swatch against the panel background
                    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
                  }}
                />
              )),
            )}
          </div>

          <div style={{ position: 'relative', height: 14, width: SIZE }}>
            {cutX.map((v, i) => (
              <Text
                key={i}
                size="10px"
                c="dimmed"
                style={{
                  position: 'absolute',
                  left: CUTS[i],
                  transform: 'translateX(-50%)',
                }}
              >
                {fmt(v)}
              </Text>
            ))}
          </div>

          <Text
            size="xs"
            fw={500}
            ta="center"
            title={measures[0]}
            style={{ maxWidth: SIZE }}
            lineClamp={2}
          >
            {measures[0]} →
          </Text>
        </div>
      </div>
    </Paper>
  );
}

function variableFilterDefs(table1: string, table2: string): filterDef[] {
  return [
    { filter_table: table1, filter_style: 'Cascade', label: 'Variable 1' },
    { filter_table: table2, filter_style: 'Cascade', label: 'Variable 2' },
  ];
}

const selectStyles = {
  label: {
    fontFamily: FONTS.body,
    marginBottom: 6,
    color: COLORS.slate,
    fontWeight: 600,
  },
  input: { borderRadius: 8 },
};

export default function VariableExplorer() {
  const [registry, setRegistry] = useState<DatasetRegistry | null>(null);
  const [dataset1, setDataset1] = useState<string | null>(null);
  const [dataset2, setDataset2] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);

  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const [legend, setLegend] = useState<Legend | null>(null);
  const [indexChart, setIndexChart] = useState<ChartItem | null>(null);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const bothCDC = dataset1 === 'cdc' && dataset2 === 'cdc';

  // Load the dataset registry once
  useEffect(() => {
    axios
      .get(`${BASE_API_URL}/load/mapping/compare/datasets`)
      .then((r) => {
        const data: DatasetRegistry = r.data;
        setRegistry(data);
        const firstKey = Object.keys(data)[0];
        if (firstKey) {
          setDataset1(firstKey);
          setDataset2(firstKey);
          setLevel(data[firstKey].levels[0]);
        }
      })
      .catch((e) => console.error('dataset registry fetch failed', e));
  }, []);

  // The composite index is a CDC-only, whole-dataset summary, independent of
  // which two measures are picked — refetch whenever the level changes,
  // while both sides remain CDC. (Resets happen in the select handlers, not
  // here, so this effect never sets state synchronously in its body.)
  useEffect(() => {
    if (!bothCDC || !level) return;
    let cancelled = false;
    const url = `${BASE_API_URL}/load/mapping/compare/cdc/${level}/composite_index`;
    axios
      .post(url, [])
      .then((r) => {
        if (cancelled) return;
        setIndexChart({
          id: `cdc-${level}-composite`,
          title: 'Community Health Composite Index',
          type: 'chart',
          subtype: 'bar',
          xField: 'Name',
          yField: 'Composite Index',
          chartParams: { datakeys: [['Composite Index', '#3b7dd8']] },
          data: r.data.data,
          description:
            'The Composite Index summarizes every CDC Places measure into a single score using Principal Component Analysis (PCA), standardized against the Vermont average for this geography level. Positive means above the Vermont average across most measures; negative means below.',
        });
        setIndexError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setIndexChart(null);
        setIndexError(
          'Not enough shared data to compute a composite index for this selection.',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [bothCDC, level]);

  const resetComparison = () => {
    setGeojson(null);
    setLegend(null);
    setApplyError(null);
    setIndexChart(null);
    setIndexError(null);
    setHoveredId(null);
  };

  // Level options are the geography levels BOTH chosen datasets support —
  // e.g. CDC (county/tract) paired with Demographics (county/town) can only
  // ever compare at the county level.
  const sharedLevels = (ds1: string, ds2: string, reg: DatasetRegistry) =>
    reg[ds1].levels.filter((lvl) => reg[ds2].levels.includes(lvl));

  const handleSelectDataset1 = (value: string | null) => {
    if (!value || !registry || !dataset2) return;
    setDataset1(value);
    const shared = sharedLevels(value, dataset2, registry);
    setLevel((prev) => (prev && shared.includes(prev) ? prev : shared[0]));
    resetComparison();
  };

  const handleSelectDataset2 = (value: string | null) => {
    if (!value || !registry || !dataset1) return;
    setDataset2(value);
    const shared = sharedLevels(dataset1, value, registry);
    setLevel((prev) => (prev && shared.includes(prev) ? prev : shared[0]));
    resetComparison();
  };

  const handleSelectLevel = (value: string) => {
    setLevel(value);
    resetComparison();
  };

  const handleApply = async (specs: FilterSpec[]) => {
    if (!level) return;
    const payload = assemble(specs);
    if (payload.length !== 2) {
      setApplyError('Choose both Variable 1 and Variable 2 to compare.');
      return;
    }
    setApplyError(null);
    try {
      const url = `${BASE_API_URL}/load/mapping/compare/${level}`;
      const res = await postRequest({ dataURL: url, payload });
      setGeojson(res.data);
      setLegend(res.metadata?.legend ?? null);
    } catch {
      setGeojson(null);
      setLegend(null);
      setApplyError(
        'Could not compare those variables — try a different pair.',
      );
    }
  };

  const datasetOptions = registry
    ? Object.entries(registry).map(([value, info]) => ({
        value,
        label: info.label,
      }))
    : [];

  const levelOptions =
    (registry &&
      dataset1 &&
      dataset2 &&
      sharedLevels(dataset1, dataset2, registry)) ||
    [];

  const scatterTile = geojson && (
    <VariableScatter
      geojson={geojson}
      legend={legend}
      activeId={hoveredId}
      onPointHover={setHoveredId}
    />
  );
  const indexTile = bothCDC && indexChart && (
    <div style={{ height: 360 }}>
      <SamePerXBarChart chart={indexChart} />
    </div>
  );
  const indexErrorTile = bothCDC && !indexChart && indexError && (
    <Text size="sm" c="dimmed" ta="center" mt="xl">
      {indexError}
    </Text>
  );

  return (
    <QuadTileMapLayout
      title="Variable Explorer"
      sidebar={
        <>
          {!registry ? (
            <Loader size="sm" my="md" color="green" />
          ) : (
            <>
              <Paper
                withBorder
                radius="md"
                p="sm"
                mb="md"
                style={{
                  borderColor: COLORS.line,
                  backgroundColor: COLORS.birch,
                }}
              >
                <Select
                  label="Variable 1 — Dataset"
                  data={datasetOptions}
                  value={dataset1}
                  onChange={handleSelectDataset1}
                  allowDeselect={false}
                  mb="sm"
                  styles={selectStyles}
                />
                <Select
                  label="Variable 2 — Dataset"
                  data={datasetOptions}
                  value={dataset2}
                  onChange={handleSelectDataset2}
                  allowDeselect={false}
                  mb={levelOptions.length > 1 ? 'sm' : 0}
                  styles={selectStyles}
                />

                {levelOptions.length > 1 && (
                  <SegmentedControl
                    fullWidth
                    color="green"
                    radius="md"
                    data={levelOptions.map((lvl) => ({
                      label: LEVEL_LABELS[lvl] ?? lvl,
                      value: lvl,
                    }))}
                    value={level ?? levelOptions[0]}
                    onChange={handleSelectLevel}
                  />
                )}
              </Paper>

              {dataset1 && dataset2 && (
                <FilterWrap
                  key={`${dataset1}-${dataset2}`}
                  handleApply={handleApply}
                  filterList={variableFilterDefs(
                    registry[dataset1].filter_table,
                    registry[dataset2].filter_table,
                  )}
                />
              )}

              {applyError && (
                <Text size="xs" c="red" mt="sm">
                  {applyError}
                </Text>
              )}

              {legend && <BivariateLegend legend={legend} />}
            </>
          )}
        </>
      }
      map={
        <VTMap
          geojson={geojson}
          showCountyLines={false}
          initialZoom={8}
          onFeatureHover={setHoveredId}
          highlightId={hoveredId}
        />
      }
      tiles={[scatterTile, indexTile, indexErrorTile].filter(
        (tile): tile is NonNullable<typeof tile> => Boolean(tile),
      )}
    />
  );
}
