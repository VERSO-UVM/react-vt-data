'use client';

import { usePathname } from 'next/navigation';
import {
  Anchor,
  Badge,
  Burger,
  Container,
  Group,
  Image,
  Menu,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import classes from './HeaderMenu.module.css';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ProfileModal } from '../profile/SetProfile';
import { COLORS, FONTS } from '@/app/theme';

type SubLink = { link: string; label: string };
type NavGroup = { label: string; links: SubLink[] };
type NavItem = {
  link: string;
  label: string;
  links?: SubLink[];
  groups?: NavGroup[];
};

const links: NavItem[] = [
  { link: '/', label: 'Home' },
  {
    link: '/mapping',
    label: 'Map',
    links: [
      { link: '/mapping/zoning', label: 'Zoning' },
      { link: '/mapping/soil-suitability', label: 'Soil Suitability' },
      {
        link: '/mapping/treatment-facilities',
        label: 'Wastewater Treatment Facilities',
      },
      {
        link: '/mapping/service-areas',
        label: 'Wastewater System Service Areas',
      },
      { link: '/mapping/flood-legal', label: 'Flood Insurance' },
      { link: '/mapping/ambulance', label: 'Ambulance Service Areas' },
    ],
  },
  {
    link: '/data-viewer',
    label: 'Data',
    groups: [
      {
        label: 'Explore',
        links: [
          { link: '/data-viewer', label: 'Data Viewer' },
          {
            link: '/data-comparison/variable-explorer',
            label: 'Variable Explorer',
          },
        ],
      },
      {
        label: 'Compare',
        links: [
          {
            link: '/data-comparison/dp-explorer',
            label: 'Data Profile Comparison',
          },
          {
            link: '/data-comparison/variable-comparison',
            label: 'Variable Comparison',
          },
        ],
      },
      {
        label: 'Reports',
        links: [
          {
            link: '/data-comparison/b-tables',
            label: 'Automatic/Topic Reports',
          },
          { link: '/working-report', label: 'Working Report' },
        ],
      },
      {
        label: 'Export',
        links: [{ link: '/data-export', label: 'Data Export' }],
      },
    ],
  },
  {
    link: '/resources',
    label: 'Resources',

    // I outlined future sections of our "Resources" page below (formerly "Tools") -Ian
    links: [
      { link: '/resources/benefits-estimator', label: 'Benefits Estimator' },
      { link: '/resources/data-sources', label: 'Data Sources ' },
      // { link: '/resources/github', label: 'GitHub' },
      // { link: '/resources/tutorial', label: 'Tutorial' },
    ],
  },
  // Future sections of the "About" page outlined below
  {
    link: '/about',
    label: 'About',
    links: [
      { link: '/about/team', label: 'Our Team' },
      // { link: '/about/faq', label: 'FAQs' },
      // { link: '/about/contact', label: 'Contact Us' },
    ],
  },
];

export default function HeaderMenu() {
  const pathname = usePathname(); /* Get the current pathname */

  const [opened, { toggle }] = useDisclosure(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;

    const onScroll = () => {
      const currentY = window.scrollY;

      // Don't hide while near the top
      if (currentY < 80) {
        setHidden(false);
      } else if (currentY > lastY) {
        // Scrolling down
        setHidden(true);
      } else {
        // Scrolling up
        setHidden(false);
      }

      lastY = currentY;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const items = links.map((link) => {
    const subRoutes: SubLink[] =
      link.links ?? link.groups?.flatMap((group) => group.links) ?? [];

    const active =
      pathname === link.link ||
      pathname.startsWith(link.link + '/') ||
      subRoutes.some(
        (sub) => pathname === sub.link || pathname.startsWith(sub.link + '/'),
      );

    const flatItems = link.links?.map((item) => (
      <Menu.Item key={item.link} component={Link} href={item.link}>
        {item.label}
      </Menu.Item>
    ));

    const groupedItems = link.groups?.flatMap((group, groupIndex) => {
      const groupContent = [
        <Menu.Label key={`${link.label}-${group.label}-label`}>
          {group.label}
        </Menu.Label>,
        ...group.links.map((item) => (
          <Menu.Item key={item.link} component={Link} href={item.link}>
            {item.label}
          </Menu.Item>
        )),
      ];

      if (groupIndex < (link.groups?.length ?? 0) - 1) {
        groupContent.push(
          <Menu.Divider key={`${link.label}-${group.label}-divider`} />,
        );
      }

      return groupContent;
    });

    const menuItems = flatItems ?? groupedItems;

    if (menuItems) {
      return (
        <Menu
          key={link.label}
          trigger="hover"
          shadow="xl"
          radius="lg"
          offset={10}
          transitionProps={{
            transition: 'pop-top-left',
            duration: 150,
          }}
          withinPortal
        >
          <Menu.Target>
            <Link
              href={link.link}
              className={`${classes.link} ${active ? classes.active : ''}`}
            >
              <UnstyledButton style={{ display: 'flex', alignItems: 'center' }}>
                <span className={classes.linkLabel}>{link.label}</span>
              </UnstyledButton>
            </Link>
          </Menu.Target>
          <Menu.Dropdown>{menuItems}</Menu.Dropdown>
        </Menu>
      );
    }
    return (
      <Link
        href={link.link}
        key={link.link}
        className={`${classes.link} ${active ? classes.active : ''}`}
      >
        <UnstyledButton style={{ display: 'flex', alignItems: 'center' }}>
          <span className={classes.linkLabel}>{link.label}</span>
        </UnstyledButton>
      </Link>
    );
  });

  return (
    <header className={`${classes.header} ${hidden ? classes.hidden : ''}`}>
      <Container size="xl">
        <div className={classes.inner}>
          <Group gap="lg">
            <Anchor href="/">
              <Image
                src="/images/VDC_logo.jpg"
                alt="Logo"
                w={140}
                h={50}
                style={{ cursor: 'pointer' }}
              />
            </Anchor>
            <Badge
              style={{
                color: COLORS.birch,
                background: COLORS.amber,
                fontFamily: FONTS.mono,
              }}
            >
              Beta
            </Badge>
          </Group>

          {/* Navigation items separated into their own wrapping group */}
          <Group
            gap={4}
            visibleFrom="md"
            wrap="wrap"
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            {items}
          </Group>
          <ProfileModal />

          <Burger opened={opened} onClick={toggle} size="sm" hiddenFrom="md" />
        </div>
      </Container>
    </header>
  );
}
