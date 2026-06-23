import {
  Paper,
  Stack,
  Text,
  UnstyledButton,
  Badge,
  Title,
  Divider,
  SegmentedControl,
  TextInput,
  Checkbox,
  Box,
} from '@mantine/core';

import { IconSearch } from '@tabler/icons-react';

interface SidebarSection {
  id: string;
  label: string;
  count: number;
}

interface DataViewerSidebarProps {
  sections: SidebarSection[];
  activeSection?: string;

  focusMode: 'all' | 'focus';
  setFocusMode: (value: 'all' | 'focus') => void;

  search: string;
  onSearchChange: (value: string) => void;

  selectedCategories: string[];
  onCategoriesChange: (value: string[]) => void;
}

export function DataViewerSidebar({
  sections,
  activeSection,
  focusMode,
  setFocusMode,
  search,
  onSearchChange,
  selectedCategories,
  onCategoriesChange,
}: DataViewerSidebarProps) {
  return (
    <Paper
      withBorder
      radius="lg"
      p="md"
    >
      <Stack gap="md">
        <Title order={4}>Filters</Title>

        <SegmentedControl
          size="sm"
          value={focusMode}
          onChange={(v) =>
            setFocusMode(v as 'all' | 'focus')
          }
          data={[
            { label: 'All', value: 'all' },
            { label: 'Focus', value: 'focus' },
          ]}
        />

        <TextInput
          placeholder="Search charts..."
          value={search}
          onChange={(e) =>
            onSearchChange(e.currentTarget.value)
          }
          leftSection={<IconSearch size={14} />}
        />

        <Box>
          <Text fw={600} mb="xs">
            Categories
          </Text>

          <Checkbox.Group
            value={selectedCategories}
            onChange={onCategoriesChange}
          >
            <Stack gap={4}>
              {sections.map((section) => (
                <Checkbox
                  key={section.id}
                  value={section.label}
                  label={`${section.label} (${section.count})`}
                />
              ))}
            </Stack>
          </Checkbox.Group>
        </Box>

<Divider />
      </Stack>
    </Paper>
  );
}