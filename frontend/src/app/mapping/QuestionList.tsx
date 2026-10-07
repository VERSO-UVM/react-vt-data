'use client';

import { useState } from 'react';
import { IconArrowRight, IconCheck, IconX } from '@tabler/icons-react';
import { MAP_PRESETS, type MapPreset } from './MapPresets';
import styles from './explorer.module.css';

/** The presets, offered as questions to ask of the town. Picking one puts
 *  the right layers and filters on the map; picking it again clears it. */
export default function QuestionList({
  activeId,
  onSelect,
  onClear,
}: {
  activeId: string | null;
  onSelect: (preset: MapPreset) => void;
  onClear: () => void;
}) {
  const [showCriteria, setShowCriteria] = useState(false);

  return (
    <div className={styles.questions}>
      {MAP_PRESETS.map((preset) => {
        const active = preset.id === activeId;
        const Icon = preset.icon;
        return (
          <div
            key={preset.id}
            className={styles.question}
            data-active={active || undefined}
          >
            <button
              type="button"
              className={styles.questionButton}
              aria-pressed={active}
              onClick={() => (active ? onClear() : onSelect(preset))}
            >
              <span className={styles.questionIcon}>
                <Icon size={19} stroke={1.8} />
              </span>
              <span className={styles.questionText}>{preset.question}</span>
              <span className={styles.questionArrow}>
                {active ? <IconX size={16} /> : <IconArrowRight size={16} />}
              </span>
            </button>
            {active && (
              <div className={styles.questionBody}>
                {preset.description}
                {preset.criteria && (
                  <div>
                    <button
                      type="button"
                      aria-expanded={showCriteria}
                      onClick={() => setShowCriteria((open) => !open)}
                    >
                      {showCriteria ? 'Hide the tests' : 'How is this decided?'}
                    </button>
                    {showCriteria && (
                      <ul className={styles.criteria}>
                        {preset.criteria.map((test) => (
                          <li key={test}>
                            <IconCheck size={14} style={{ marginTop: 2 }} />
                            <span>{test}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
