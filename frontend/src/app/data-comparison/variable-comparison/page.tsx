'use client';
import { Select, keys, Paper, Text } from '@mantine/core';
import { useState } from 'react';
import type { FeatureCollection } from 'geojson';
import { BASE_API_URL } from '@/config';
import VTMap from '@/components/mapping';
import VariableScatter from '@/components/Charts/MapCorrespondentScatter';
import { cdc_filtering } from '@/components/FilterRedux/filterDefs';
import { FilterWrap } from '@/components/FilterRedux/filterWrap';
import { assemble } from '@/components/FilterRedux/apiHelpers';
import { postRequest } from '@/components/FilterRedux/filterRequest';
import { FilterSpec } from '@/components/FilterRedux/filterTypes';
import QuadTileMapLayout from '@/components/QuadTileMapLayout';
import { ChartItem } from '@/types/cachedCharts';
import { SamePerXBarChart } from '@/components/Charts';

type Legend = {
  grid: number[][][]; // [y][x] -> rgba, matches the map's fill colors
  measures: [string, string];
  edges_x: number[]; // bin edges incl. min/max; interior values are the cutpoints
  edges_y: number[];
};

const CELL = 34; // px per legend cell
const GAP = 2; // px gap between cells (surface shows through)
const SIZE = 3 * CELL + 2 * GAP;
// y offset (from grid top) / x offset (from grid left) of the two cell boundaries
const CUTS = [1, 2].map((i) => i * CELL + (i - 0.5) * GAP);

const rgba = (c: number[]) => `rgba(${c[0]},${c[1]},${c[2]},${c[3] / 255})`;
const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

/**
 * 3x3 bivariate legend. The grid colors come straight from the API response,
 * so they are exactly the colors on the map. Tick values sit at the cell
 * boundaries (they are the bin cutpoints, not cell centers).
 */
function BivariateLegend({ legend }: { legend: Legend }) {
  const { grid, measures, edges_x, edges_y } = legend;
  const cutX = edges_x.slice(1, -1);
  const cutY = edges_y.slice(1, -1);

  return (
    <Paper withBorder p="sm" radius="md" mt="md">
      <Text size="xs" c="dimmed" mb={8}>
        Regions are shaded by both measures at once — darker means higher on
        both.
      </Text>
      <Text size="xs" fw={500} title={measures[1]} lineClamp={2} mb={4}>
        ↑ {measures[1]}
      </Text>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
        {/* y tick values, aligned to the cell boundaries */}
        <div style={{ position: 'relative', width: 26, height: SIZE }}>
          {cutY.map((v, i) => (
            <Text
              key={i}
              size="10px"
              c="dimmed"
              style={{
                position: 'absolute',
                right: 0,
                // y axis increases upward: first cutpoint is the LOWER boundary
                top: SIZE - CUTS[i],
                transform: 'translateY(-50%)',
              }}
            >
              {fmt(v)}
            </Text>
          ))}
        </div>

        <div>
          {/* the 3x3 grid; row y=2 (highest) rendered first */}
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

          {/* x tick values at the cell boundaries */}
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

const validDatasets = {
  'CDC, County Level': `${BASE_API_URL}/load/mapping/cdc/places/county_comparison`,
  'CDC, Tract Level': `${BASE_API_URL}/load/mapping/cdc/places/tract_comparison`,
};

const pcaURL = `${BASE_API_URL}/load/mapping/cdc/places/pca_summary`;

function DataSetSelector({
  handleSelect,
}: {
  handleSelect: (value: string) => void;
}) {
  return (
    <Select
      label="Select Dataset"
      data={Object.keys(validDatasets)}
      onChange={handleSelect}
      defaultValue={'CDC, County Level'}
    />
  );
}

export default function VariableComparison() {
  const [legend, setLegend] = useState<Legend | null>(null);
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const [comparisonURL, setComparisonURL] = useState<string>(
    validDatasets['CDC, County Level'],
  );
  const [pcaChart, setPCAChart] = useState<ChartItem | null>(null);

  const handleSelectDataSet = (value: string): void => {
    setComparisonURL(validDatasets[value as keyof typeof validDatasets]);
    if (value === 'CDC, County Level') {
      // setPCASummaryURL(pcaURL);
    }
  };

  const handleApply = async (specs: FilterSpec[]) => {
    const payload = assemble(specs);
    // one response carries geojson (data) + legend (metadata), so the legend
    // colors always match the map colors
    const url = comparisonURL as string;
    const res = await postRequest({ dataURL: url, payload });

    setGeojson(res.data);
    setLegend(res.metadata?.legend ?? null);

    if (url === validDatasets['CDC, County Level']) {
      const pcaRes = await postRequest({ dataURL: pcaURL, payload });
      setPCAChart({
        id: 'cdc-county-pca',
        title: 'Combined Health Burden Index',
        type: 'chart',
        subtype: 'bar',
        xField: 'CountyName',
        yField: 'Health Burden',
        chartParams: { datakeys: [['Health Burden', '#3b7dd8']] },
        data: pcaRes.data,
        description:
          'The Health Burden represents a weighted combination of every Health Burden variable, with the weight based on how unusual that value is compared to the national average. It is based on Principal Component Analysis, or PCA. Negative health burden means the county has fewer health issues than the average American county.',
      });
    }
  };

  return (
    <QuadTileMapLayout
      title="Compare Health Indicators"
      sidebar={
        <>
          <DataSetSelector handleSelect={handleSelectDataSet} />
          {comparisonURL && (
            <FilterWrap handleApply={handleApply} filterList={cdc_filtering} />
          )}
          {legend && <BivariateLegend legend={legend} />}
        </>
      }
      map={
        <VTMap
          geojson={geojson}
          showCountyLines={false}
          controllerOn={false}
          initialZoom={8}
        />
      }
      tiles={[
        geojson && <VariableScatter geojson={geojson} legend={legend} />,
        pcaChart && (
          <div style={{ height: 360 }}>
            <SamePerXBarChart chart={pcaChart} />
          </div>
        ),
      ]}
    />
  );
}
