'use client';

import Link from 'next/link';
import {
  Box,
  Button,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconBriefcase,
  IconHeartbeat,
  IconHome2,
  IconMap2,
  IconPencil,
  IconUsers,
  type Icon,
} from '@tabler/icons-react';
import { COLORS } from '@/app/theme';
import { useProfile } from '@/components/profile/profileStore';
import {
  COMPARISON_COLOR,
  TOPIC_ACCENTS,
} from '@/components/Reports/shared/colors';
import { DashboardSection, TOPIC_SLUGS, topicPath } from './topics';

const TOPICS: Record<
  DashboardSection,
  { icon: Icon; blurb: string; shows: string }
> = {
  Demographics: {
    icon: IconUsers,
    blurb: 'Who lives here.',
    shows: 'Population, age, sex, race and ethnicity',
  },
  Housing: {
    icon: IconHome2,
    blurb: 'The homes and what they cost.',
    shows: 'Home values, housing units, occupancy, vacancy',
  },
  'Labor & Economy': {
    icon: IconBriefcase,
    blurb: 'How people earn.',
    shows: 'Household and per capita income, unemployment',
  },
  'Land Use': {
    icon: IconMap2,
    blurb: 'How land can be used.',
    shows: 'Zoning districts, residential allowances, wastewater permits',
  },
  'Community Health': {
    icon: IconHeartbeat,
    blurb: 'How residents are doing.',
    shows: 'CDC health indicators, poverty and insurance trends',
  },
};

export default function TopicLanding() {
  const { myLocation, comparison, openProfileModal } = useProfile();

  return (
    <Box bg={COLORS.birch} style={{ minHeight: 'calc(100vh - 70px)' }}>
      <Container size="xl" py={56}>
        <Stack gap="xs" mb={40} maw={720}>
          <Title order={1} c={COLORS.spruce} fz={44}>
            Reports by Topic
          </Title>
          <Text size="lg" c={COLORS.slate}>
            Pick a topic to see how your place compares with a benchmark.
          </Text>
          <Group gap="xl" mt="md" align="center" wrap="wrap">
            {[
              [COLORS.spruce, 'Your place', myLocation.name],
              [COMPARISON_COLOR, 'Compared with', comparison.name],
            ].map(([color, label, name]) => (
              <Group key={label} gap={8} wrap="nowrap">
                <Box
                  w={10}
                  h={10}
                  bg={color}
                  style={{ borderRadius: '50%', flexShrink: 0 }}
                />
                <Stack gap={0}>
                  <Text size="xs" c={COLORS.slate}>
                    {label}
                  </Text>
                  <Text fw={600} c={COLORS.ink}>
                    {name}
                  </Text>
                </Stack>
              </Group>
            ))}
          </Group>
          <Button
            variant="subtle"
            size="compact-sm"
            color={COLORS.spruce}
            leftSection={<IconPencil size={14} />}
            onClick={openProfileModal}
            style={{ alignSelf: 'flex-start' }}
            px={0}
          >
            Change comparison
          </Button>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {(Object.keys(TOPIC_SLUGS) as DashboardSection[]).map((topic) => {
            const { icon: TopicIcon, blurb, shows } = TOPICS[topic];
            const accent = TOPIC_ACCENTS[topic];
            return (
              <Box
                key={topic}
                component={Link}
                href={topicPath(topic)}
                p="xl"
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  color: 'inherit',
                  background: '#fff',
                  boxShadow: '0 1px 2px rgba(27,58,47,.06)',
                  border: `1px solid ${COLORS.line}`,
                  borderTop: `4px solid ${accent}`,
                  borderRadius: 12,
                }}
              >
                <Group gap="sm" mb="xs" c={accent}>
                  <TopicIcon size={24} />
                  <Title order={3} c={COLORS.spruce}>
                    {topic}
                  </Title>
                </Group>
                <Text fw={500} mb={4} c={COLORS.ink}>
                  {blurb}
                </Text>
                <Text size="sm" c={COLORS.slate}>
                  {shows}
                </Text>
                <Text size="sm" fw={700} mt="md" c={accent}>
                  Open report →
                </Text>
              </Box>
            );
          })}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
