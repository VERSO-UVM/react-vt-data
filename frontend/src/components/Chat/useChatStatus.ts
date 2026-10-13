import { useEffect, useState } from 'react';
import { fetchChatStatus, type ChatStatus } from './api';

// One request per page load, shared by the header and the chat page.
let pending: Promise<ChatStatus> | null = null;

/** Whether the backend has chat turned on; null while checking. */
export function useChatStatus(): ChatStatus | null {
  const [status, setStatus] = useState<ChatStatus | null>(null);
  useEffect(() => {
    let cancelled = false;
    pending ??= fetchChatStatus();
    pending.then((s) => !cancelled && setStatus(s));
    return () => {
      cancelled = true;
    };
  }, []);
  return status;
}
