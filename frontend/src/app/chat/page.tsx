'use client';

/**
 * Data Chat (v0): ask questions about the warehouse. Hidden unless the backend
 * sets CHAT_ENABLED; chats live in localStorage. See
 * docs/architecture/data-chat.md.
 */
import { useEffect, useRef, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Button,
  Container,
  Group,
  Loader,
  Select,
  Stack,
  Text,
  Textarea,
  Title,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  ArrowClockwiseIcon,
  ArrowUpIcon,
  CheckIcon,
  CopyIcon,
  PlusIcon,
  StopIcon,
  TrashIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import { v4 as uuidv4 } from 'uuid';
import { streamChat } from '@/components/Chat/api';
import { AnswerMarkdown, Steps } from '@/components/Chat/AnswerParts';
import { ChatChart } from '@/components/Chat/ChatChart';
import { type ChatTurn, toHistory, useChat } from '@/components/Chat/chatStore';
import { useChatStatus } from '@/components/Chat/useChatStatus';
import {
  type Location,
  useProfile,
  useProfileHydrated,
} from '@/components/profile/profileStore';
import classes from './Chat.module.css';

/** Starter questions about the visitor's own place (from their profile),
 *  each showing a different kind of answer: a trend, a ranking, and a
 *  breakdown. Falls back to statewide questions. */
function suggestionsFor(location: Location): string[] {
  const county = location.county ? `${location.county} County` : null;
  if (location.type === 'town' && location.town && county) {
    return [
      `How has median household income in ${location.town} changed since 2011?`,
      `Which 10 towns in ${county} have the highest share of cost-burdened renters?`,
      `What is the age breakdown of ${location.town}?`,
    ];
  }
  if (location.type === 'county' && county) {
    return [
      `How has median household income in ${county} changed since 2011?`,
      `Which 10 towns in ${county} have the highest share of cost-burdened renters?`,
      `How has the mix of jobs by sector changed in ${county}?`,
    ];
  }
  return [
    'How has median household income in Vermont changed since 2011?',
    'Which 10 Vermont towns have the highest share of cost-burdened renters?',
    'How has the mix of jobs by sector changed in Chittenden County?',
  ];
}

/** Copies an answer's markdown. Some embedded browsers block the async
 *  clipboard, so fall back to a selection copy, and say so if both fail. */
function CopyAnswer({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      ok = document.execCommand('copy');
      area.remove();
    }
    setState(ok ? 'copied' : 'failed');
    setTimeout(() => setState('idle'), 2000);
  }
  const label =
    state === 'copied'
      ? 'Copied'
      : state === 'failed'
        ? "Couldn't copy"
        : 'Copy answer';
  return (
    <Tooltip label={label} withArrow opened={state !== 'idle' || undefined}>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="sm"
        aria-label="Copy answer"
        onClick={copy}
      >
        {state === 'copied' ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
      </ActionIcon>
    </Tooltip>
  );
}

function AssistantTurn({
  turn,
  busy,
  onRetry,
}: {
  turn: ChatTurn;
  /** Still streaming: hide the actions until the answer is complete. */
  busy: boolean;
  /** Set on the newest answer only: ask its question again. */
  onRetry?: () => void;
}) {
  return (
    <Stack gap="md">
      <Steps steps={turn.steps ?? []} />
      {turn.charts?.map((c) => (
        <ChatChart key={c.id} spec={c.spec} />
      ))}
      {turn.content && <AnswerMarkdown content={turn.content} />}
      {turn.error && (
        <Group gap="sm">
          <Group gap={6} c="orange.8">
            <WarningCircleIcon size={16} />
            <Text size="sm">{turn.error}</Text>
          </Group>
          {onRetry && !busy && (
            <Button
              size="compact-sm"
              variant="default"
              leftSection={<ArrowClockwiseIcon size={14} />}
              onClick={onRetry}
            >
              Try again
            </Button>
          )}
        </Group>
      )}
      {!busy && !turn.error && turn.content && (
        <Group gap={2} className={classes.actions}>
          <CopyAnswer text={turn.content} />
          {onRetry && (
            <Tooltip label="Ask again" withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                aria-label="Ask again"
                onClick={onRetry}
              >
                <ArrowClockwiseIcon size={14} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      )}
    </Stack>
  );
}

export default function ChatPage() {
  const status = useChatStatus();
  const {
    conversations,
    activeId,
    newConversation,
    selectConversation,
    deleteConversation,
    addTurn,
    updateTurn,
    removeTurns,
  } = useChat();
  const myLocation = useProfile((s) => s.myLocation);
  const profileHydrated = useProfileHydrated();
  const suggestions = suggestionsFor(
    profileHydrated ? myLocation : { type: 'state', name: 'Vermont' },
  );
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const turns = active?.turns ?? [];
  // A chat joins the list once it has a question; until then it's just the
  // blank page behind "New chat".
  const recent = conversations.filter((c) => c.turns.length > 0);

  /** Drop the newest question and its answer, then ask the question again. */
  function retry(answerId: string) {
    const index = turns.findIndex((t) => t.id === answerId);
    const question = turns[index - 1];
    if (!active || question?.role !== 'user' || streaming) return;
    removeTurns(active.id, [question.id, answerId]);
    ask(question.content);
  }

  const lastContent = turns[turns.length - 1]?.content;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns.length, lastContent]);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || streaming) return;
    setInput('');
    const conversationId = activeId ?? newConversation();
    const prior =
      useChat.getState().conversations.find((c) => c.id === conversationId)
        ?.turns ?? [];
    const userTurn: ChatTurn = { id: uuidv4(), role: 'user', content: text };
    const answerId = uuidv4();
    addTurn(conversationId, userTurn);
    addTurn(conversationId, {
      id: answerId,
      role: 'assistant',
      content: '',
      steps: [],
      charts: [],
    });
    const update = (fn: (t: ChatTurn) => ChatTurn) =>
      updateTurn(conversationId, answerId, fn);

    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
    // Text arrives in many small deltas; write it to the persisted store at
    // most every 100 ms instead of on every chunk.
    let answer = '';
    let lastFlush = 0;
    const flush = () => {
      lastFlush = Date.now();
      update((t) => ({ ...t, content: answer }));
    };
    try {
      for await (const event of streamChat(
        toHistory([...prior, userTurn]),
        controller.signal,
      )) {
        switch (event.type) {
          case 'text':
            answer += event.delta;
            if (Date.now() - lastFlush > 100) flush();
            break;
          case 'tool_call':
            update((t) => ({
              ...t,
              steps: [
                ...(t.steps ?? []),
                { id: event.id, name: event.name, status: 'running' },
              ],
            }));
            break;
          case 'tool_result':
            update((t) => ({
              ...t,
              steps: (t.steps ?? []).map((s) =>
                s.id === event.id
                  ? {
                      ...s,
                      status: event.ok ? 'ok' : 'error',
                      error: event.error,
                    }
                  : s,
              ),
            }));
            break;
          case 'chart':
            update((t) => ({
              ...t,
              charts: [
                ...(t.charts ?? []),
                { id: event.id, spec: event.chart },
              ],
            }));
            break;
          case 'error':
            update((t) => ({ ...t, error: event.message }));
            break;
        }
      }
    } catch (e) {
      const stopped = (e as Error).name === 'AbortError';
      update((t) => ({
        ...t,
        error: stopped ? 'Stopped.' : 'The connection was lost. Try again.',
      }));
    } finally {
      flush();
      // Steps still running when the stream ended didn't finish.
      update((t) => ({
        ...t,
        steps: (t.steps ?? []).map((s) =>
          s.status === 'running' ? { ...s, status: 'error' } : s,
        ),
      }));
      setStreaming(false);
      abortRef.current = null;
    }
  }

  if (status === null) {
    return (
      <Container py="xl">
        <Loader color="gray" />
      </Container>
    );
  }

  if (!status.enabled) {
    return (
      <Container py="xl" size="sm">
        <Title order={2}>Ask the Data</Title>
        <Text mt="sm" c="dimmed">
          This feature isn&apos;t available right now.
        </Text>
      </Container>
    );
  }

  return (
    <Container size="xl" py="lg">
      <div className={classes.layout}>
        <aside className={classes.sidebar}>
          <UnstyledButton
            className={classes.newChat}
            onClick={() => newConversation()}
            disabled={streaming}
          >
            <PlusIcon size={16} />
            New chat
          </UnstyledButton>
          {recent.length > 0 && (
            <div className={classes.sidebarLabel}>Recent</div>
          )}
          {recent.map((c) => (
            <div
              key={c.id}
              className={`${classes.conversationRow} ${
                c.id === activeId ? classes.conversationActive : ''
              }`}
            >
              <UnstyledButton
                className={classes.conversation}
                onClick={() => selectConversation(c.id)}
                disabled={streaming}
                title={c.title}
              >
                {c.title}
              </UnstyledButton>
              <ActionIcon
                className={classes.deleteButton}
                variant="subtle"
                color="gray"
                size="sm"
                aria-label={`Delete "${c.title}"`}
                onClick={() => deleteConversation(c.id)}
                disabled={streaming}
              >
                <TrashIcon size={14} />
              </ActionIcon>
            </div>
          ))}
        </aside>

        <div className={classes.main}>
          {/* Narrow screens hide the sidebar; pick past chats here instead. */}
          {recent.length > 0 && (
            <Group hiddenFrom="md" gap="xs" wrap="nowrap" mb="sm">
              <Select
                style={{ flex: 1 }}
                aria-label="Past chats"
                placeholder="Past chats"
                data={recent.map((c) => ({
                  value: c.id,
                  label: c.title,
                }))}
                value={activeId}
                onChange={(id) => id && selectConversation(id)}
                disabled={streaming}
                allowDeselect={false}
              />
              <ActionIcon
                size="lg"
                variant="default"
                aria-label="New chat"
                onClick={() => newConversation()}
                disabled={streaming}
              >
                <PlusIcon size={16} />
              </ActionIcon>
            </Group>
          )}

          {turns.length === 0 ? (
            <div className={classes.empty}>
              <Group gap="xs">
                <Title order={2}>Ask the Data</Title>
                <Badge variant="light" color="gray" size="sm">
                  Beta
                </Badge>
              </Group>
              <Text c="dimmed">
                Ask about Vermont housing, demographics, the economy, health, or
                zoning. Answers come from this site&apos;s datasets and cite
                their sources.
              </Text>
              <div className={classes.suggestions}>
                {suggestions.map((s) => (
                  <UnstyledButton
                    key={s}
                    className={classes.suggestion}
                    onClick={() => ask(s)}
                  >
                    {s}
                  </UnstyledButton>
                ))}
              </div>
            </div>
          ) : (
            <div
              className={classes.thread}
              aria-live="polite"
              aria-busy={streaming}
            >
              {turns.map((turn, i) =>
                turn.role === 'user' ? (
                  <div key={turn.id} className={classes.userTurn}>
                    {turn.content}
                  </div>
                ) : (
                  <AssistantTurn
                    key={turn.id}
                    turn={turn}
                    busy={streaming && i === turns.length - 1}
                    onRetry={
                      i === turns.length - 1 ? () => retry(turn.id) : undefined
                    }
                  />
                ),
              )}
            </div>
          )}
          {/* Clear the sticky composer when scrolling to the newest text. */}
          <div ref={bottomRef} style={{ scrollMarginBottom: 140 }} />

          <div className={classes.composer}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
            >
              <div className={classes.inputBox}>
                <Textarea
                  className={classes.input}
                  variant="unstyled"
                  placeholder="Ask a question about Vermont data"
                  autosize
                  minRows={1}
                  maxRows={6}
                  maxLength={4000}
                  value={input}
                  onChange={(e) => setInput(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      ask(input);
                    }
                  }}
                  aria-label="Your question"
                />
                {streaming ? (
                  <ActionIcon
                    size={36}
                    radius="xl"
                    variant="default"
                    aria-label="Stop answering"
                    onClick={() => abortRef.current?.abort()}
                  >
                    <StopIcon size={14} weight="fill" />
                  </ActionIcon>
                ) : (
                  <ActionIcon
                    size={36}
                    radius="xl"
                    type="submit"
                    aria-label="Send question"
                    disabled={!input.trim()}
                  >
                    <ArrowUpIcon size={18} weight="bold" />
                  </ActionIcon>
                )}
              </div>
            </form>
            <div className={classes.disclaimer}>
              Answers are generated by AI and can be wrong. Check the cited
              sources before relying on a number.
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
