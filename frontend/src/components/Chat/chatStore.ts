/**
 * Chat history, persisted in localStorage like the working report. v0 has no
 * server storage: the browser owns conversations and sends the text history
 * with each question (docs/architecture/data-chat.md).
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { ChartSpec, HistoryMessage } from './api';

export interface ToolStep {
  id: string;
  name: string;
  status: 'running' | 'ok' | 'error';
  error?: string | null;
}

export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  // Assistant-only: what the agent did and the charts it drew, in order.
  steps?: ToolStep[];
  charts?: { id: string; spec: ChartSpec }[];
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  turns: ChatTurn[];
}

interface ChatStore {
  conversations: Conversation[];
  activeId: string | null;
  newConversation: () => string;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  addTurn: (conversationId: string, turn: ChatTurn) => void;
  updateTurn: (
    conversationId: string,
    turnId: string,
    update: (turn: ChatTurn) => ChatTurn,
  ) => void;
  removeTurns: (conversationId: string, turnIds: string[]) => void;
}

// Keep localStorage well under its ~5 MB budget.
const MAX_CONVERSATIONS = 30;

export const useChat = create<ChatStore>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeId: null,
      newConversation: () => {
        // Reuse an untouched chat rather than stacking empty ones.
        const empty = get().conversations.find((c) => c.turns.length === 0);
        if (empty) {
          set({ activeId: empty.id });
          return empty.id;
        }
        const id = uuidv4();
        set((s) => ({
          conversations: [
            {
              id,
              title: 'New chat',
              createdAt: new Date().toISOString(),
              turns: [],
            },
            ...s.conversations,
          ].slice(0, MAX_CONVERSATIONS),
          activeId: id,
        }));
        return id;
      },
      selectConversation: (id) => set({ activeId: id }),
      deleteConversation: (id) =>
        set((s) => ({
          conversations: s.conversations.filter((c) => c.id !== id),
          activeId: s.activeId === id ? null : s.activeId,
        })),
      addTurn: (conversationId, turn) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  // Name the chat after its first question.
                  title:
                    c.turns.length === 0 && turn.role === 'user'
                      ? turn.content.slice(0, 60)
                      : c.title,
                  turns: [...c.turns, turn],
                }
              : c,
          ),
        })),
      updateTurn: (conversationId, turnId, update) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  turns: c.turns.map((t) => (t.id === turnId ? update(t) : t)),
                }
              : c,
          ),
        })),
      removeTurns: (conversationId, turnIds) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === conversationId
              ? { ...c, turns: c.turns.filter((t) => !turnIds.includes(t.id)) }
              : c,
          ),
        })),
    }),
    { name: 'vt-data-chat' },
  ),
);

/** The text history the API expects; failed or empty answers are skipped.
 *  Tool calls aren't replayed, so charts are noted by title to keep the
 *  model aware of what the user has already seen. */
export function toHistory(turns: ChatTurn[]): HistoryMessage[] {
  return turns
    .filter((t) => t.content.trim() && !(t.role === 'assistant' && t.error))
    .map((t) => {
      const charts = (t.charts ?? []).map(
        (c) => `[Chart shown: ${c.spec.title}]`,
      );
      return {
        role: t.role,
        content: [...charts, t.content].join('\n'),
      };
    });
}
