'use client';

/**
 * Pieces of an agent answer shared by the chat page and the eval comparison
 * page, so both show answers exactly the same way.
 */
import { useState } from 'react';
import { Loader, UnstyledButton } from '@mantine/core';
import {
  CaretDownIcon,
  CaretRightIcon,
  CheckIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import classes from './AnswerParts.module.css';

/** The fields Steps needs; chat turns and eval transcripts both have them. */
export interface StepLike {
  id?: string;
  name: string;
  status?: 'running' | 'ok' | 'error';
  ok?: boolean;
  error?: string | null;
}

const stepStatus = (step: StepLike) =>
  step.status ?? (step.ok === false ? 'error' : 'ok');

// Plain-language names for what the agent is doing.
const STEP_LABELS: Record<string, string> = {
  list_datasets: 'Browsing datasets',
  describe_dataset: 'Reading dataset details',
  search_variables: 'Finding variables',
  search_locations: 'Looking up places',
  query_data: 'Querying data',
  get_timeseries: 'Pulling a time series',
  compare_places: 'Comparing places',
  get_zoning_summary: 'Summarizing zoning',
  rank_rows: 'Ranking',
  render_chart: 'Drawing a chart',
};

const stepLabel = (step: StepLike) => STEP_LABELS[step.name] ?? step.name;

/** One quiet line: the current step while working, then a step count that
 *  expands to the full list. Failed steps are usually retried by the agent,
 *  so they're only shown in the expanded list. */
export function Steps({ steps }: { steps: StepLike[] }) {
  const [open, setOpen] = useState(false);
  if (!steps.length) return null;
  const current = [...steps].reverse().find((s) => stepStatus(s) === 'running');
  return (
    <div className={classes.steps}>
      <UnstyledButton
        className={classes.stepsToggle}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {current ? (
          <Loader size={12} color="gray" />
        ) : open ? (
          <CaretDownIcon size={12} />
        ) : (
          <CaretRightIcon size={12} />
        )}
        {current
          ? `${stepLabel(current)}…`
          : `Used ${steps.length} step${steps.length === 1 ? '' : 's'}`}
      </UnstyledButton>
      {open && (
        <div className={classes.stepList}>
          {steps.map((step, i) => (
            <div key={step.id ?? i} className={classes.stepItem}>
              {stepStatus(step) === 'running' ? (
                <Loader size={10} color="gray" />
              ) : stepStatus(step) === 'ok' ? (
                <CheckIcon size={12} />
              ) : (
                <WarningCircleIcon size={12} />
              )}
              {stepLabel(step)}
              {step.error ? ` (retried: ${step.error})` : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** An answer's markdown, with sources opening in a new tab and wide tables
 *  scrolling inside the column. */
export function AnswerMarkdown({ content }: { content: string }) {
  return (
    <div className={classes.markdown}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className={classes.tableWrap}>
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
