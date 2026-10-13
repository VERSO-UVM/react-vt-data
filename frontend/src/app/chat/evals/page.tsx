'use client';

/**
 * Local comparison of Data Chat eval runs: pick a run and up to a few models,
 * then read each case's answers, charts, and judge verdicts side by side.
 * Development only; see docs/guides/chat-evals.md. Not linked from the nav.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Code,
  Container,
  Group,
  Loader,
  MultiSelect,
  Select,
  Stack,
  Table,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import {
  CheckCircleIcon,
  WarningCircleIcon,
  XCircleIcon,
} from '@phosphor-icons/react';
import { AnswerMarkdown, Steps } from '@/components/Chat/AnswerParts';
import { ChatChart } from '@/components/Chat/ChatChart';
import {
  type EvalCase,
  type EvalResult,
  type EvalRunListItem,
  type EvalSummary,
  type FullEvalRun,
  fetchEvalRun,
  fetchEvalRuns,
} from '@/components/Chat/evalsApi';
import classes from './Evals.module.css';

const DEFAULT_COLUMNS = 3;

const shortModel = (model: string) => model.split('/').pop() ?? model;

const pct = (v: number | null | undefined) =>
  v == null ? '—' : `${Math.round(v * 100)}%`;
const usd = (v: number | null | undefined) =>
  v == null ? '—' : v < 0.01 ? `$${v.toFixed(4)}` : `$${v.toFixed(3)}`;
const secs = (v: number | null | undefined) =>
  v == null ? '—' : `${Math.round(v)}s`;
const count = (v: number | null | undefined) =>
  v == null ? '—' : Math.round(v).toLocaleString('en-US');

function scoreColor(score: number | null) {
  if (score == null) return 'gray';
  return score >= 0.9 ? 'teal' : score >= 0.7 ? 'yellow' : 'red';
}

function runLabel(run: EvalRunListItem) {
  const when = new Date(run.created_at).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${when} · ${run.models.map(shortModel).join(', ')}`;
}

/** Which model is best in each summary column (higher or lower wins). */
function bestBy(rows: EvalSummary[]) {
  const pick = (key: keyof EvalSummary, higher: boolean) => {
    const values = rows
      .map((r) => r[key])
      .filter((v): v is number => typeof v === 'number');
    if (values.length < 2) return null;
    return higher ? Math.max(...values) : Math.min(...values);
  };
  return {
    score: pick('score', true),
    quality: pick('quality', true),
    cost_per_chat: pick('cost_per_chat', false),
    latency_s: pick('latency_s', false),
    tokens: pick('tokens', false),
  };
}

function SummaryTable({ rows }: { rows: EvalSummary[] }) {
  const best = bestBy(rows);
  const cell = (key: keyof typeof best, value: number | null, text: string) => (
    <Table.Td
      ta="right"
      className={value != null && value === best[key] ? classes.best : ''}
    >
      {text}
    </Table.Td>
  );
  return (
    <Table className={classes.summary} verticalSpacing="xs" withTableBorder>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Model</Table.Th>
          <Table.Th ta="right">Score</Table.Th>
          <Table.Th ta="right">Judge quality</Table.Th>
          <Table.Th ta="right">Cost / chat</Table.Th>
          <Table.Th ta="right">Time / chat</Table.Th>
          <Table.Th ta="right">Tokens / chat</Table.Th>
          <Table.Th ta="right">Errors</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((r) => (
          <Table.Tr key={r.model}>
            <Table.Td>{r.model}</Table.Td>
            {cell('score', r.score, pct(r.score))}
            {cell(
              'quality',
              r.quality,
              r.quality == null ? '—' : `${r.quality.toFixed(1)}/10`,
            )}
            {cell('cost_per_chat', r.cost_per_chat, usd(r.cost_per_chat))}
            {cell('latency_s', r.latency_s, secs(r.latency_s))}
            {cell('tokens', r.tokens, count(r.tokens))}
            <Table.Td ta="right">{r.errors}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

/** Checks and judge criteria; failures always show, passes on request. */
function Verdict({ result }: { result: EvalResult }) {
  const [showAll, setShowAll] = useState(false);
  const items = [
    ...result.checks.map((c) => ({
      text: c.name,
      passed: c.passed,
      reason: c.detail,
    })),
    ...(result.judge?.criteria ?? []),
  ];
  const passed = items.filter((i) => i.passed).length;
  const shown = showAll ? items : items.filter((i) => !i.passed);
  return (
    <Stack gap={8}>
      {result.judge?.error && (
        <Alert color="orange" p="xs" icon={<WarningCircleIcon />}>
          Judge failed: {result.judge.error}
        </Alert>
      )}
      {result.judge?.summary && (
        <Text size="sm" c="dimmed" fs="italic">
          {result.judge.summary}
        </Text>
      )}
      <div className={classes.criteria}>
        {shown.map((item, i) => (
          <div key={i} className={classes.criterion} title={item.reason}>
            {item.passed ? (
              <CheckCircleIcon size={16} color="var(--mantine-color-teal-7)" />
            ) : (
              <XCircleIcon size={16} color="var(--mantine-color-red-7)" />
            )}
            <span>
              {item.text}
              {!item.passed && (
                <Text component="span" size="xs" c="dimmed" display="block">
                  {item.reason}
                </Text>
              )}
            </span>
          </div>
        ))}
      </div>
      <UnstyledButton onClick={() => setShowAll((v) => !v)}>
        <Text size="xs" c="dimmed" td="underline">
          {showAll
            ? 'Show only failures'
            : `${passed} of ${items.length} passed · show all`}
        </Text>
      </UnstyledButton>
    </Stack>
  );
}

function ModelColumn({ result }: { result: EvalResult }) {
  return (
    <div className={classes.column}>
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Text fw={600} style={{ overflowWrap: 'anywhere' }}>
          {shortModel(result.model)}
        </Text>
        <Badge color={scoreColor(result.score)} variant="light" size="lg">
          {pct(result.score)}
        </Badge>
      </Group>
      <Text size="xs" c="dimmed">
        Quality{' '}
        {result.judge?.quality != null ? `${result.judge.quality}/10` : '—'}
        {' · '}
        {usd(result.cost_usd)} · {secs(result.latency_s)} ·{' '}
        {count(result.tokens)} tokens
      </Text>
      <Verdict result={result} />
      {result.turns.map((turn, i) => (
        <Stack key={i} gap="sm">
          {result.turns.length > 1 && (
            <div className={classes.question}>{turn.question}</div>
          )}
          <Steps steps={turn.steps} />
          {turn.charts.map((chart, j) => (
            <ChatChart key={j} spec={chart} />
          ))}
          {turn.answer && <AnswerMarkdown content={turn.answer} />}
          {turn.error && (
            <Group gap={6} c="orange.8">
              <WarningCircleIcon size={16} />
              <Text size="sm">{turn.error}</Text>
            </Group>
          )}
        </Stack>
      ))}
    </div>
  );
}

function CaseSection({
  evalCase,
  results,
}: {
  evalCase: EvalCase;
  results: EvalResult[];
}) {
  return (
    <section className={classes.case}>
      <Stack gap="xs" mb="md">
        <Group gap="xs">
          <Title order={3}>{evalCase.title}</Title>
          <Badge variant="light" color="gray">
            {evalCase.capability}
          </Badge>
        </Group>
        {evalCase.turns.map((q, i) => (
          <Text key={i} size="sm">
            <Text span c="dimmed">
              {evalCase.turns.length > 1 ? `Turn ${i + 1}: ` : 'Question: '}
            </Text>
            {q}
          </Text>
        ))}
      </Stack>
      <div
        className={classes.columns}
        style={{
          gridTemplateColumns: `repeat(${results.length}, minmax(340px, 1fr))`,
        }}
      >
        {results.map((r) => (
          <ModelColumn key={r.model} result={r} />
        ))}
      </div>
    </section>
  );
}

function Setup({ hasEndpoint }: { hasEndpoint: boolean }) {
  return (
    <Stack gap="sm" maw={680}>
      <Text>
        {hasEndpoint
          ? 'No eval runs yet. Run one, then reload this page:'
          : 'Start the API with eval results enabled to compare runs here:'}
      </Text>
      <Code block>
        {hasEndpoint
          ? 'just chat-eval openai/gpt-6.1-sol openai/gpt-6-luna'
          : 'just chat-eval-ui'}
      </Code>
      <Text size="sm" c="dimmed">
        See docs/guides/chat-evals.md for picking models and adding cases.
      </Text>
    </Stack>
  );
}

export default function EvalsPage() {
  const [runs, setRuns] = useState<EvalRunListItem[] | null | undefined>();
  const [runId, setRunId] = useState<string | null>(null);
  const [run, setRun] = useState<FullEvalRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [repeat, setRepeat] = useState(0);

  useEffect(() => {
    fetchEvalRuns().then((list) => {
      setRuns(list);
      if (list?.length) setRunId(list[0].run_id);
    });
  }, []);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    fetchEvalRun(runId)
      .then((r) => {
        if (cancelled) return;
        setError(null);
        setRun(r);
        setModels(r.models.slice(0, DEFAULT_COLUMNS));
        setRepeat(0);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const summary = useMemo(
    () => run?.summary.filter((s) => models.includes(s.model)) ?? [],
    [run, models],
  );

  return (
    <Container size="xl" py="lg">
      <Stack gap="xl">
        <Stack gap={4}>
          <Group gap="xs">
            <Title order={2}>Model comparison</Title>
            <Badge variant="light" color="gray" size="sm">
              Dev
            </Badge>
          </Group>
          <Text c="dimmed">
            Each model answers the same chats; a judge grades them against
            reference data from the warehouse.
            {run?.judge_model && ` Judge: ${run.judge_model}.`}
          </Text>
        </Stack>

        {runs === undefined ? (
          <Loader color="gray" />
        ) : !runs?.length ? (
          <Setup hasEndpoint={runs !== null} />
        ) : (
          <>
            <div className={classes.controls}>
              <Select
                label="Run"
                w={420}
                data={runs.map((r) => ({
                  value: r.run_id,
                  label: runLabel(r),
                }))}
                value={runId}
                onChange={setRunId}
                allowDeselect={false}
              />
              {run && (
                <MultiSelect
                  label="Models to compare"
                  w={460}
                  data={run.models}
                  value={models}
                  onChange={setModels}
                />
              )}
              {run && run.repeat > 1 && (
                <Select
                  label="Repeat"
                  w={120}
                  data={Array.from({ length: run.repeat }, (_, i) => ({
                    value: String(i),
                    label: `Run ${i + 1}`,
                  }))}
                  value={String(repeat)}
                  onChange={(v) => setRepeat(Number(v ?? 0))}
                  allowDeselect={false}
                />
              )}
            </div>

            {error && <Alert color="red">{error}</Alert>}

            {run && models.length > 0 && (
              <>
                <SummaryTable rows={summary} />
                {run.cases.map((c) => (
                  <CaseSection
                    key={c.id}
                    evalCase={c}
                    results={models
                      .map((m) =>
                        run.results.find(
                          (r) =>
                            r.model === m &&
                            r.case_id === c.id &&
                            r.repeat === repeat,
                        ),
                      )
                      .filter((r): r is EvalResult => !!r)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </Stack>
    </Container>
  );
}
