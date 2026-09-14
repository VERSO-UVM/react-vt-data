'use client';

import {
  Box,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import * as motion from 'motion/react-client';
import { BellRingingIcon } from '@phosphor-icons/react';
import { COLORS, FONTS } from '@/app/theme';

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default function AnnouncementsPage() {
  return (
    <Box style={{ backgroundColor: COLORS.birch, minHeight: '100vh' }}>
      <Box
        style={{
          background: `linear-gradient(145deg, ${COLORS.spruceDeep} 0%, ${COLORS.spruce} 100%)`,
        }}
        pt={{ base: 55, sm: 75 }}
        pb={{ base: 45, sm: 60 }}
      >
        <Container size="xl">
          <Group gap={10} mb={20}>
            <Box
              style={{ width: 28, height: 1, background: COLORS.amberSoft }}
            />
            <Text
              style={{
                fontFamily: FONTS.mono,
                fontSize: 12,
                letterSpacing: '0.14em',
                color: COLORS.amberSoft,
              }}
            >
              WHAT&apos;S NEW
            </Text>
          </Group>

          <Group gap="md" align="flex-start">
            <ThemeIcon
              size={54}
              radius="md"
              variant="light"
              style={{
                backgroundColor: 'rgba(246,245,239,.1)',
                color: COLORS.amberSoft,
              }}
            >
              <BellRingingIcon size={28} weight="duotone" />
            </ThemeIcon>

            <Stack gap={4}>
              <Title
                order={1}
                style={{
                  fontFamily: FONTS.display,
                  color: COLORS.birch,
                  fontSize: 'clamp(2.4rem, 5vw, 4rem)',
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}
              >
                Announcements
              </Title>
              <Text
                maw={620}
                style={{
                  color: 'rgba(246,245,239,.72)',
                  lineHeight: 1.7,
                }}
              >
                New features, datasets, articles, and milestones from the
                Vermont Data Collaborative.
              </Text>
            </Stack>
          </Group>
        </Container>
      </Box>

      <Container size="lg" py={{ base: 50, sm: 70 }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Box
            py={90}
            ta="center"
            style={{
              border: `1px dashed ${COLORS.line}`,
              borderRadius: 16,
              backgroundColor: COLORS.birchDim,
            }}
          >
            <ThemeIcon
              size={54}
              radius="xl"
              variant="light"
              style={{
                backgroundColor: COLORS.birch,
                color: COLORS.slate,
                margin: '0 auto',
              }}
            >
              <BellRingingIcon size={26} />
            </ThemeIcon>

            <Title
              order={3}
              mt="lg"
              style={{
                fontFamily: FONTS.display,
                color: COLORS.ink,
              }}
            >
              No announcements yet
            </Title>

            <Text size="sm" c="dimmed" mt={8} maw={420} mx="auto">
              We&apos;ll post here as soon as there&apos;s news to share.
            </Text>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
}
