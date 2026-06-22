import {
  Paper,
  Stack,
  Text,
  UnstyledButton,
  Badge,
  Title,
  Divider,
} from '@mantine/core';

interface SidebarSection {
  id: string;
  label: string;
  count: number;
}

interface DataViewerSidebarProps {
  sections: SidebarSection[];
  activeSection?: string;
}

export function DataViewerSidebar({
  sections,
  activeSection,
}: DataViewerSidebarProps) {
  return (
    <Paper
      withBorder
      radius="lg"
      p="md"
      style={{
        position: 'sticky',
        top: 20,
      }}
    >
      <Stack gap="md">
        <div>
          <Title order={4}>Browse</Title>
        </div>
        <Divider />

        {sections.map((section) => (
          <UnstyledButton
            key={section.id}
            onClick={() =>
              document
                .getElementById(section.id)
                ?.scrollIntoView({ behavior: 'smooth' })
            }
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background:
                activeSection === section.id
                  ? 'var(--mantine-color-blue-light)'
                  : 'transparent',
            }}
          >
            <Text fw={activeSection === section.id ? 600 : 400}>
              {section.label}
            </Text>

            <Badge
              variant="light"
              size="sm"
              ml="auto"
            >
              {section.count}
            </Badge>
          </UnstyledButton>
        ))}
      </Stack>
    </Paper>
  );
}