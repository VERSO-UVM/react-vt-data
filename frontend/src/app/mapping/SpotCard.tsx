'use client';

import type { CSSProperties } from 'react';
import { CloseButton, Stack, Tabs } from '@mantine/core';
import type { MapClick } from '@/components/mapping';
import {
  DetailSectionCard,
  detailSections,
  formatDetailValue,
  isBlank,
} from '@/components/mapping/FeatureDetails';
import { MAP_LAYERS } from './MapLayers';
import type { SpotRow } from './townInsights';
import styles from './explorer.module.css';

const SPOT_TAB = 'At this spot';

function ReportRow({
  row,
  onShowLayer,
}: {
  row: SpotRow;
  onShowLayer: (id: string) => void;
}) {
  const fields = row.fields.filter(([, value]) => !isBlank(value));
  return (
    <div className={styles.spotRow} data-status={row.status}>
      <span
        className={styles.spotDot}
        style={{ '--c': row.color } as CSSProperties}
      />
      <div className={styles.spotRowTitle}>
        {row.title}
        {row.status === 'off' && (
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => onShowLayer(row.id)}
          >
            Show on map
          </button>
        )}
      </div>
      <div className={styles.spotRowBody}>
        {row.status === 'off' && 'Not on the map yet.'}
        {row.status === 'none' &&
          (row.fields.length > 0 || row.id !== 'overlap'
            ? 'None at this spot.'
            : 'No — not at this spot.')}
        {row.status === 'here' &&
          (fields.length > 0 ? (
            fields.map(([key, value]) => (
              <div key={key} className={styles.spotField}>
                <span>{key}</span>
                <span>{formatDetailValue(key, value)}</span>
              </div>
            ))
          ) : (
            <span className={styles.spotAnswer}>Yes — this spot is in it.</span>
          ))}
      </div>
    </div>
  );
}

/** Details for a clicked spot: what every layer has there, then the
 *  clicked feature's own fields. */
export default function SpotCard({
  click,
  report,
  townName,
  onShowLayer,
  onClose,
}: {
  click: MapClick;
  report: SpotRow[];
  townName: string;
  onShowLayer: (id: string) => void;
  onClose: () => void;
}) {
  const layer = MAP_LAYERS.find((l) => l.id === click.layerId);
  const tooltip = click.feature.properties?.tooltip as
    Record<string, unknown> | undefined;
  const named = layer?.nameField ? tooltip?.[layer.nameField] : undefined;
  const title = String(
    (isBlank(named) ? tooltip?.__title__ : named) ?? `A spot in ${townName}`,
  );
  const eyebrow = layer?.title ?? (tooltip ? 'On the map' : 'Nothing mapped');

  const sections = tooltip ? detailSections(tooltip) : [];
  const sectionTabs = [...new Set(sections.map((section) => section.tab))];
  const [lng, lat] = click.coordinate;

  return (
    <aside className={styles.spot} aria-label="Details for the clicked spot">
      <div className={styles.spotHead}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 8,
          }}
        >
          <span className={styles.eyebrow}>{eyebrow}</span>
          <CloseButton
            size="sm"
            aria-label="Close details"
            onClick={onClose}
            style={{ marginTop: -4, marginRight: -6 }}
          />
        </div>
        <h2 className={styles.spotTitle}>{title}</h2>
      </div>

      <Tabs
        // A different kind of feature has different tabs, so start over.
        key={click.layerId}
        defaultValue={SPOT_TAB}
        className={styles.spotBody}
        color="var(--spruce)"
      >
        {sectionTabs.length > 0 && (
          <Tabs.List px="md" style={{ flexWrap: 'nowrap' }}>
            {[SPOT_TAB, ...sectionTabs].map((tab) => (
              <Tabs.Tab key={tab} value={tab} px="sm">
                {tab}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        )}

        <Tabs.Panel value={SPOT_TAB}>
          <div className={styles.spotRows}>
            <p className={styles.spotIntro}>
              What each layer shows at the exact spot you clicked, with the
              filters you have on.
            </p>
            {report.map((row) => (
              <ReportRow key={row.id} row={row} onShowLayer={onShowLayer} />
            ))}
          </div>
        </Tabs.Panel>

        {sectionTabs.map((tab) => (
          <Tabs.Panel key={tab} value={tab}>
            <Stack gap="sm" p="md">
              {sections
                .filter((section) => section.tab === tab)
                .map((section) => (
                  <DetailSectionCard key={section.title} section={section} />
                ))}
            </Stack>
          </Tabs.Panel>
        ))}
      </Tabs>

      <div className={styles.spotFoot}>
        <span>
          {Math.abs(lat).toFixed(5)}° N, {Math.abs(lng).toFixed(5)}° W
        </span>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Google Maps ↗
        </a>
      </div>
    </aside>
  );
}
