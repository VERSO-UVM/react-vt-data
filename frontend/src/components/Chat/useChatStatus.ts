import { useEffect, useState } from 'react';
import { fetchChatStatus, type ChatStatus } from './api';

// One request per page load, shared by the header and the chat page.
let pending: Promise<ChatStatus> | null = null;
// Mounted hooks, told when the status changes after the first check.
const listeners = new Set<(status: ChatStatus) => void>();

function publish(next: Promise<ChatStatus>) {
  pending = next;
  next.then((s) => listeners.forEach((listener) => listener(s)));
}

/** Use a status the server just returned (e.g. from entering the code). */
export function setChatStatus(status: ChatStatus) {
  publish(Promise.resolve(status));
}

/** Check again, e.g. after a request was refused because the code changed. */
export function refreshChatStatus() {
  publish(fetchChatStatus());
}

/** Whether the backend has chat turned on; null while checking. */
export function useChatStatus(): ChatStatus | null {
  const [status, setStatus] = useState<ChatStatus | null>(null);
  useEffect(() => {
    let cancelled = false;
    listeners.add(setStatus);
    pending ??= fetchChatStatus();
    pending.then((s) => !cancelled && setStatus(s));
    return () => {
      cancelled = true;
      listeners.delete(setStatus);
    };
  }, []);
  return status;
}
