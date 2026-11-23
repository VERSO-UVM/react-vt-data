/**
 * Saved eval runs (backend/evals/chat), served by backend/chat/evals_router.py
 * when the API runs with CHAT_EVALS_DIR set (`just chat-eval-ui`).
 */
import { BASE_API_URL } from '@/config';
import type { ChartSpec } from './api';

export interface EvalStep {
  name: string;
  ok: boolean;
  error: string | null;
}

export interface EvalTurn {
  question: string;
  answer: string;
  steps: EvalStep[];
  charts: (ChartSpec & { row_count?: number; data_error?: string })[];
  error: string | null;
  usage: { cost_usd?: number | null; input_tokens?: number };
  latency_s: number;
}

export interface EvalCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface EvalCriterion {
  text: string;
  passed: boolean;
  reason: string;
}

export interface EvalJudge {
  criteria?: EvalCriterion[];
  quality?: number;
  summary?: string;
  cost_usd?: number | null;
  error?: string;
}

export interface EvalResult {
  model: string;
  case_id: string;
  repeat: number;
  turns: EvalTurn[];
  checks: EvalCheck[];
  judge: EvalJudge | null;
  score: number | null;
  cost_usd: number | null;
  latency_s: number;
  tokens: number;
}

export interface EvalCase {
  id: string;
  title: string;
  capability: string;
  turns: string[];
  criteria: string[];
  references: { label: string; row_count: number }[];
}

export interface EvalSummary {
  model: string;
  chats: number;
  score: number | null;
  quality: number | null;
  cost_per_chat: number | null;
  latency_s: number | null;
  tokens: number | null;
  errors: number;
}

/** A run as listed: its models and summary, with cases counted. */
export interface EvalRunListItem {
  run_id: string;
  created_at: string;
  models: string[];
  judge_model: string | null;
  cases: number;
  summary: EvalSummary[];
  /** Runs save after every chat; false while one is still going. */
  complete: boolean;
  finished: number;
  total: number;
}

/** One saved run: every model's transcript for every case. */
export interface FullEvalRun {
  run_id: string;
  created_at: string;
  git_sha: string | null;
  judge_model: string | null;
  models: string[];
  repeat: number;
  cases: EvalCase[];
  results: EvalResult[];
  summary: EvalSummary[];
  /** Missing on runs saved before progress saving existed (complete). */
  complete?: boolean;
  total?: number;
}

/** null when the API has no eval endpoint (not started with CHAT_EVALS_DIR). */
export async function fetchEvalRuns(): Promise<EvalRunListItem[] | null> {
  try {
    const res = await fetch(`${BASE_API_URL}/chat/evals`);
    return res.ok ? ((await res.json()) as EvalRunListItem[]) : null;
  } catch {
    return null;
  }
}

export async function fetchEvalRun(runId: string): Promise<FullEvalRun> {
  const res = await fetch(
    `${BASE_API_URL}/chat/evals/${encodeURIComponent(runId)}`,
  );
  if (!res.ok) throw new Error(`Couldn't load run ${runId} (${res.status})`);
  return (await res.json()) as FullEvalRun;
}
