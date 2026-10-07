'use client';

/**
 * @description
 *   The small cards that float over the map: the headline figures, the map
 *   key, and the camera controls.
 */

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Loader } from '@mantine/core';
import {
  IconChevronDown,
  IconFocusCentered,
  IconHandClick,
  IconMap,
  IconMinus,
  IconPhoto,
  IconPlus,
} from '@tabler/icons-react';
import { AnimatePresence, motion } from 'motion/react';
import MapLegend from '@/components/Legend';
import type { Basemap } from '@/components/mapping';
import type { Insight, KeyGroup } from './townInsights';
import styles from './explorer.module.css';

/** The map's answer in numbers: one headline figure per layer shown. */
export function InsightStrip({
  insights,
  loading,
}: {
  insights: Insight[];
  /** Names of the layers still loading. */
  loading: string[];
}) {
  if (insights.length === 0 && loading.length === 0) return null;

  return (
    <>
      {insights.length > 0 && (
        <div className={styles.strip}>
          <AnimatePresence initial={false} mode="popLayout">
            {insights.map((insight) => (
              <motion.div
                key={insight.id}
                className={styles.insight}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className={styles.insightValue}>
                  <span
                    className={styles.dot}
                    style={{ '--c': insight.color } as CSSProperties}
                  />
                  {insight.value}
                </div>
                <div className={styles.insightLabel}>{insight.label}</div>
                {insight.detail && (
                  <div className={styles.insightDetail}>{insight.detail}</div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      {loading.length > 0 && (
        <div className={styles.pill} role="status">
          <Loader size={14} />
          Loading {loading.join(', ').toLowerCase()}…
        </div>
      )}
    </>
  );
}

/** What the colors on the map mean, for every layer currently drawn. */
export function MapKey({ groups }: { groups: KeyGroup[] }) {
  const [open, setOpen] = useState(true);
  if (groups.length === 0) return null;

  return (
    <div className={styles.key}>
      <button
        type="button"
        className={styles.keyHead}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.eyebrow}>Map key</span>
        <IconChevronDown
          size={16}
          style={{ transform: open ? 'none' : 'rotate(180deg)' }}
        />
      </button>
      {open && (
        <>
          <div className={styles.keyBody}>
            {groups.map((group) => (
              <div key={group.id}>
                <div className={styles.keyTitle}>{group.title}</div>
                <MapLegend items={group.items} />
                {group.note && (
                  <div className={styles.keyNote}>{group.note}</div>
                )}
              </div>
            ))}
          </div>
          <div className={styles.keyFoot}>
            <IconHandClick size={14} />
            Click anywhere in town for details
          </div>
        </>
      )}
    </div>
  );
}

export function MapControls({
  basemap,
  onBasemap,
  onZoom,
  onRefit,
}: {
  basemap: Basemap;
  onBasemap: (basemap: Basemap) => void;
  onZoom: (delta: number) => void;
  onRefit: () => void;
}) {
  const aerial = basemap === 'aerial';
  return (
    <div className={styles.controls}>
      <div className={styles.controlGroup}>
        <button
          type="button"
          aria-pressed={aerial}
          onClick={() => onBasemap(aerial ? 'light' : 'aerial')}
        >
          {aerial ? <IconMap size={16} /> : <IconPhoto size={16} />}
          {aerial ? 'Street map' : 'Aerial photo'}
        </button>
      </div>
      <div className={styles.controlGroup}>
        <button type="button" aria-label="Zoom in" onClick={() => onZoom(1)}>
          <IconPlus size={18} />
        </button>
        <button type="button" aria-label="Zoom out" onClick={() => onZoom(-1)}>
          <IconMinus size={18} />
        </button>
        <button
          type="button"
          aria-label="Fit the whole area on screen"
          title="Fit the whole area on screen"
          onClick={onRefit}
        >
          <IconFocusCentered size={18} />
        </button>
      </div>
    </div>
  );
}
