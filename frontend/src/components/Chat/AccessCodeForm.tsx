'use client';

/**
 * Shown on /chat when the backend requires an access code and this browser
 * hasn't entered it. The code is shared with testers until there are
 * accounts; the server remembers it in a cookie.
 */
import { useState } from 'react';
import {
  Button,
  Container,
  Group,
  PasswordInput,
  Text,
  Title,
} from '@mantine/core';
import { unlockChat } from './api';
import { setChatStatus } from './useChatStatus';

export function AccessCodeForm() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      setChatStatus(await unlockChat(code));
    } catch (err) {
      setError((err as Error).message);
      setSending(false);
    }
  }

  return (
    <Container py="xl" size="xs">
      <Title order={2}>Ask the Data</Title>
      <Text mt="sm" c="dimmed">
        Chat is in testing. Enter the access code you were given.
      </Text>
      <form onSubmit={submit}>
        <PasswordInput
          mt="lg"
          label="Access code"
          value={code}
          onChange={(e) => setCode(e.currentTarget.value)}
          error={error}
          autoComplete="off"
          autoFocus
        />
        <Group mt="md">
          <Button type="submit" loading={sending} disabled={!code.trim()}>
            Continue
          </Button>
        </Group>
      </form>
    </Container>
  );
}
