/**
 * Client for the data chat API (backend/chat/router.py). The chat routes only
 * exist when the backend sets CHAT_ENABLED, so every caller must treat a
 * failed status check as "chat is off". When the backend also sets
 * CHAT_ACCESS_CODE, entering the code sets an HttpOnly cookie, so every request
 * sends credentials (the dev frontend calls the API on another port).
 */
import { BASE_API_URL } from '@/config';
import type { AgentChartKind } from '@/components/Charts/AgentChart';
import type { DataRow } from '@/types/cachedCharts';

/** A tool call the browser can re-run to get a chart's rows. */
export interface DataRef {
  tool:
    'query_data' | 'get_timeseries' | 'compare_places' | 'get_zoning_summary';
  args: Record<string, unknown>;
  // Optional ranking over every row (e.g. a top-10 bar chart).
  sort_by?: string | null;
  descending?: boolean;
  top?: number | null;
}

/** A chart that references its data instead of carrying rows. */
export interface ChartSpec {
  kind: AgentChartKind;
  title: string;
  data: DataRef;
  // x and y are required for every kind except table.
  x?: string | null;
  y?: string | null;
  columns?: string[] | null;
  series?: string | null;
  y_label?: string | null;
  note?: string | null;
}

export interface ChartData {
  columns: string[];
  units?: Record<string, string> | null;
  provenance?: Record<string, unknown> | null;
  rows: DataRow[];
  truncated: boolean;
}

export interface ChatStatus {
  enabled: boolean;
  available: boolean;
  resets_at: string | null;
  // False until this browser has entered the access code.
  unlocked: boolean;
}

export type ChatEvent =
  | { type: 'text'; delta: string }
  | {
      type: 'tool_call';
      id: string;
      name: string;
      args: Record<string, unknown>;
    }
  | {
      type: 'tool_result';
      id: string;
      name: string;
      ok: boolean;
      error: string | null;
    }
  | { type: 'chart'; id: string; chart: ChartSpec }
  | { type: 'done'; usage: Record<string, number> }
  | { type: 'error'; message: string };

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  // Tool calls an earlier answer made; the server replays them so follow-ups
  // can reuse the same dataset, places, and chart.
  tools?: { name: string; args: Record<string, unknown> }[];
}

const OFF: ChatStatus = {
  enabled: false,
  available: false,
  resets_at: null,
  unlocked: false,
};

export async function fetchChatStatus(): Promise<ChatStatus> {
  try {
    const res = await fetch(`${BASE_API_URL}/chat/status`, {
      credentials: 'include',
    });
    if (!res.ok) return OFF;
    return (await res.json()) as ChatStatus;
  } catch {
    return OFF;
  }
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body.detail === 'string') return body.detail;
  } catch {
    // fall through to the generic message
  }
  return `Request failed (${res.status})`;
}

/** Ask a question and yield the server-sent events of the answer. */
export async function* streamChat(
  messages: HistoryMessage[],
  signal?: AbortSignal,
): AsyncGenerator<ChatEvent> {
  const res = await fetch(`${BASE_API_URL}/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    signal,
  });
  if (!res.ok || !res.body) {
    yield { type: 'error', message: await errorMessage(res) };
    return;
  }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    // Events are separated by a blank line; keep any partial event buffered.
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';
    for (const chunk of chunks) {
      for (const line of chunk.split('\n')) {
        if (line.startsWith('data: ')) {
          yield JSON.parse(line.slice(6)) as ChatEvent;
        }
      }
    }
  }
}

export async function fetchChartData(ref: DataRef): Promise<ChartData> {
  const res = await fetch(`${BASE_API_URL}/chat/data`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ref),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return (await res.json()) as ChartData;
}

/** Send the access code; resolves to the new status, or throws the reason. */
export async function unlockChat(code: string): Promise<ChatStatus> {
  const res = await fetch(`${BASE_API_URL}/chat/unlock`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error(await errorMessage(res));
  return (await res.json()) as ChatStatus;
}
