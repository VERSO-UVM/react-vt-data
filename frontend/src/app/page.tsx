'use client';
import React from 'react';
import '@mantine/core/styles.css';

import {
  Paper,
  Center,
  Container,
  Title,
  Text,
  Stack,
  Divider,
} from '@mantine/core';

export default function App() {
  return (
    <Container size="md" py="xl">
      <Paper p="xl" shadow="xs" withBorder>
        <Stack gap="lg">
          <Center>
            <Title order={1}>Welcome!</Title>
          </Center>

          <Text>
            This is the Vermont Data Exploration App, a prototype for a website
            where you can access, analyze, share, and request open source data
            about Vermont. We're designing the App to meet your needs, so please
            look around and remember to give us feedback!
          </Text>

          <Divider />

          <Title order={2}>Usage</Title>
          <Text>
            Use the <strong>sidebar</strong> on the left to navigate between the
            different sections of this app. Each link in the sidebar will take
            you to a separate page with its own content and tools.
          </Text>

          <Title order={2}>Caveats</Title>
          <Text>
            The Vermont Data Exploration App is still in a{' '}
            <em>private prototype</em> phase. Please don't share this link, and
            remember that both the design and content are subject to change.
          </Text>

          <Title order={2}>Feedback</Title>
          <Text>
            We’d love your feedback. Please take a moment to fill out our{' '}
            <a href="https://example.com/survey" target="_blank">
              Short Survey
            </a>
            .
          </Text>
        </Stack>
      </Paper>
    </Container>
  );
}
