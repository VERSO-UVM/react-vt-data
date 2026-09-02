// Maintenance.tsx
import React from 'react';
import {
  Container,
  Title,
  Text,
  Card,
  List,
  ListItem,
  Anchor,
  ThemeIcon,
  Stack,
  Box,
} from '@mantine/core';

export default function Maintenance(): React.JSX.Element {
  return (
    <Box
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--mantine-color-gray-0)',
      }}
    >
      <Container size="xs" p="md">
        <Stack align="center" gap="lg" text-align="center">
          {/* Visual Indicator */}
          <ThemeIcon variant="light" size="xl" radius="xl" color="blue">
            🔧
          </ThemeIcon>

          <Stack gap="xs" style={{ textAlign: 'center' }}>
            <Title order={1} fw={700} c="dark.4">
              Under Maintenance
            </Title>
            <Text c="dimmed" size="lg">
              We are updating our systems to serve you better. We'll be back
              online shortly.
            </Text>
          </Stack>

          {/* Contact Card */}
          <Card
            shadow="sm"
            padding="lg"
            radius="md"
            withBorder
            style={{ width: '100%' }}
          >
            <Title order={3} size="h4" fw={600} mb="xs">
              Need immediate assistance?
            </Title>
            <Text size="sm" c="dimmed" mb="md">
              If you need urgent support while the platform is offline, please
              email our team directly:
            </Text>

            <List spacing="sm" size="sm" center>
              {[
                { name: 'Emma Spett', email: 'Emma.Spett@uvm.edu' },
                { name: 'Fitz Koch', email: 'Fitzwilliam.Keenan-Koch@uvm.edu' },
                { name: 'Ian Sargent', email: 'Ian.Sargent@uvm.edu' },
              ].map((contact, index) => (
                <ListItem key={index}>
                  <Text size="sm" component="span" fw={600}>
                    {contact.name}:
                  </Text>
                  <Anchor href={`mailto:${contact.email}`} ml={5}>
                    {contact.email}
                  </Anchor>
                </ListItem>
              ))}
            </List>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
