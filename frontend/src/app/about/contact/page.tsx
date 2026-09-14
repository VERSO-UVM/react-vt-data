'use client';

import React from 'react';

import {
  Box,
  Card,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import * as motion from 'motion/react-client';
import {
  EnvelopeSimpleIcon,
  GithubLogoIcon,
  LinkedinLogoIcon,
  MapPinIcon,
} from '@phosphor-icons/react';
import { COLORS, FONTS } from '@/app/theme';


type ContactMethod =
  | {
      icon: typeof EnvelopeSimpleIcon;
      label: 'Email';
      value: string[];
    }
  | {
      icon: typeof MapPinIcon;
      label: 'Address';
      value: string;
    };

const CONTACT_METHODS: ContactMethod[] = [
  {
    icon: EnvelopeSimpleIcon,
    label: 'Email',
    value: ['Emma.Spett@uvm.edu', 'Ian.Sargent@uvm.edu'],
  },
  {
    icon: MapPinIcon,
    label: 'Address',
    value: '105 Carrigan Drive, Burlington, VT, 05405',
  },
];

const SOCIAL_LINKS = [
  {
    icon: GithubLogoIcon,
    label: 'GitHub',
    href: 'https://github.com/VERSO-UVM/react-vt-data',
  },
  {
    icon: LinkedinLogoIcon,
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/uvm-leahy-institute-for-rural-partnerships',
  },
];

export default function ContactPage() {
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
              style={{
                width: 28,
                height: 1,
                background: COLORS.amberSoft,
              }}
            />

            <Text
              style={{
                fontFamily: FONTS.mono,
                fontSize: 12,
                letterSpacing: '0.14em',
                color: COLORS.amberSoft,
              }}
            >
              GET IN TOUCH
            </Text>
          </Group>

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
            Contact Us
          </Title>
        </Container>
      </Box>

      <Container size="lg" py={{ base: 50, sm: 70 }}>
        <SimpleGrid
          cols={{ base: 1, sm: 2 }}
          spacing="lg"
          mb={40}
        >
          {CONTACT_METHODS.map((method, index) => {
            const Icon = method.icon;

            return (
              <motion.div
                key={method.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.06,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <Card
                  withBorder
                  radius="lg"
                  p="xl"
                  h="100%"
                  style={{
                    borderColor: COLORS.line,
                    background: COLORS.birch,
                  }}
                >
                  <ThemeIcon
                    size={46}
                    radius="md"
                    variant="light"
                    style={{
                      backgroundColor: COLORS.birchDim,
                      color: COLORS.spruce,
                    }}
                  >
                    <Icon size={23} weight="duotone" />
                  </ThemeIcon>

                  <Text
                    mt="lg"
                    size="xs"
                    fw={700}
                    style={{
                      fontFamily: FONTS.mono,
                      textTransform: 'uppercase',
                      letterSpacing: '.08em',
                      color: COLORS.slate,
                    }}
                  >
                    {method.label}
                  </Text>

                  {method.label === 'Email' ? (
                    <Stack gap={2}>
                      {method.value.map((email) => (
                        <a
                          key={email}
                          href={`mailto:${email}?subject=Vermont%20Data%20Collaborative%20Inquiry`}
                          style={{
                            display: 'inline-block',
                            marginTop: 4,
                            color: COLORS.ink,
                            fontSize: 'var(--mantine-font-size-sm)',
                            textDecoration: 'underline',
                          }}
                        >
                          {email}
                        </a>
                      ))}
                    </Stack>
                  ) : (
                    <a
                      href="https://www.google.com/maps/search/?api=1&query=105+Carrigan+Drive+Burlington+VT+05405"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        marginTop: 4,
                        color: COLORS.ink,
                        fontSize: 'var(--mantine-font-size-sm)',
                        textDecoration: 'underline',
                      }}
                    >
                      {method.value}
                    </a>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </SimpleGrid>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{
            duration: 0.5,
            delay: 0.15,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <Card
            withBorder
            radius="lg"
            p="xl"
            style={{
              borderColor: COLORS.line,
              background: COLORS.birchDim,
            }}
          >
            <Stack gap="md">
              <Box>
                <Title
                  order={3}
                  style={{
                    fontFamily: FONTS.display,
                    color: COLORS.ink,
                  }}
                >
                  Follow along
                </Title>

                <Text size="sm" c="dimmed" mt={4}>
                  Find our work and source code online.
                </Text>
              </Box>

              <Group gap="sm">
                {SOCIAL_LINKS.map((social) => {
                  const Icon = social.icon;

                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: 'none' }}
                    >
                      <Group
                        gap={8}
                        wrap="nowrap"
                        px="md"
                        py={8}
                        style={{
                          borderRadius: 999,
                          border: `1px solid ${COLORS.line}`,
                          background: COLORS.birch,
                          color: COLORS.ink,
                        }}
                      >
                        <Icon size={17} />

                        <Text size="sm" fw={500}>
                          {social.label}
                        </Text>
                      </Group>
                    </a>
                  );
                })}
              </Group>
            </Stack>
          </Card>
        </motion.div>
      </Container>
    </Box>
  );
}