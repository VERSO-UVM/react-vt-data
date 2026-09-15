'use client';

import { useState } from 'react';
import {
  Container,
  Title,
  Text,
  SimpleGrid,
  Modal,
  Stack,
  Group,
  Image,
} from '@mantine/core';
import { motion } from 'motion/react';
import { ArrowUpRightIcon } from '@phosphor-icons/react';
import { TEAM, type TeamMember } from './team';

// ---------------------------------------------------------------------------
// Team member card
// ---------------------------------------------------------------------------

function TeamCard({
  member,
  onSelect,
}: {
  member: TeamMember;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onSelect}
      style={{ cursor: 'pointer' }}
    >
      <Stack gap="xs">
        <div style={{ position: 'relative' }}>
          <Image
            src={member.image}
            alt={member.name}
            radius="md"
            h={260}
            w="100%"
            fit="cover"
            fallbackSrc="https://placehold.co/400x400?text=No+Image"
            style={{ backgroundColor: '#f1f3f5' }}
          />
          <motion.div
            animate={{
              scale: hovered ? 1.1 : 1,
              backgroundColor: hovered ? '#1B6048' : '#FFFFFF',
            }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              bottom: 10,
              right: 10,
              width: 32,
              height: 32,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            }}
          >
            <ArrowUpRightIcon
              size={18}
              color={hovered ? '#FFFFFF' : '#1B6048'}
              strokeWidth={2.5}
            />
          </motion.div>
        </div>
        <div>
          <Text fw={700} size="sm">
            {member.name}
          </Text>
          <Text fw={600} size="sm" c="dimmed">
            {member.role}
          </Text>
        </div>
      </Stack>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OurTeamPage() {
  const [selected, setSelected] = useState<TeamMember | null>(null);

  return (
    <Container size="lg" py={80}>
      <Stack align="center" gap="md" mb={60}>
        <Title
          order={1}
          ta="center"
          c="#1B6048"
          maw={800}
          size={45}
          style={{ lineHeight: 1.15 }}
        >
          Meet the Team
        </Title>
        <Text ta="center" c="dimmed" maw={520} mb={-5}>
          We build user-friendly, community-driven data tools that help
          Vermonters make sense of the challenges facing their state.
        </Text>
      </Stack>

      <SimpleGrid
        cols={{ base: 1, sm: 2, md: 4 }}
        spacing="xl"
        verticalSpacing={40}
      >
        {TEAM.map((member) => (
          <TeamCard
            key={member.name}
            member={member}
            onSelect={() => setSelected(member)}
          />
        ))}
      </SimpleGrid>

      <Modal
        opened={selected !== null}
        onClose={() => setSelected(null)}
        size="xl"
        radius="md"
        title={null}
        centered
      >
        {selected && (
          <Group align="center" gap="xl" wrap="nowrap" p="xs" mt={-15}>
            <Image
              src={selected.image}
              alt={selected.name}
              radius="md"
              w={260}
              h={260}
              fit="cover"
              fallbackSrc="https://placehold.co/400x400?text=No+Image"
              style={{ flexShrink: 0, backgroundColor: '#f1f3f5' }}
            />
            <Stack gap="sm" style={{ flex: 1 }}>
              <div>
                <Text fw={700} size="xl">
                  {selected.name}
                </Text>
                <Text fw={600} size="md" c="#1B6048">
                  {selected.role}
                </Text>
              </div>
              <Text size="md" c="dimmed" style={{ lineHeight: 1.65 }}>
                {selected.bio}
              </Text>
            </Stack>
          </Group>
        )}
      </Modal>
    </Container>
  );
}
