'use client';

import { usePathname } from 'next/navigation';
import {
  UnstyledButton,
  Burger,
  Container,
  Group,
  Menu,
  Image,
  Anchor,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import classes from './HeaderMenu.module.css';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ProfileModal } from '../profile/SetProfile';

const links = [
  { link: '/', label: 'Home' },
  {
    link: '/mapping',
    label: 'Map',
    links: [
      { link: '/mapping/zoning', label: 'Zoning' },
      { link: '/mapping/soil-suitability', label: 'Soil Suitability' },
      { link: '/mapping/treatment-facilities', label: 'Wastewater Treatment Facilities'},
      {link: '/mapping/service-areas', label: 'Wastewater System Service Areas'},
      { link: '/mapping/flood-legal', label: 'Flood Insurance' },
    ],
  },
  { link: '/data-viewer', label: 'Analyze' }, // accessible via Working Report
  {
    link: '/data-comparison',
    label: 'Compare',
    links: [
      {
        link: '/data-comparison/dp-explorer',
        label: 'Data Profile Comparison',
      },
      { link: '/data-comparison/b-tables', label: 'Detailed Table Comparison' },
      {
        link: '/data-comparison/variable-comparison',
        label: 'Variable Comparison',
      },
    ],
  },
  { link: '/working-report', label: 'Report' },
  { link: '/data-export', label: 'Data Export' },
  {
    link: '/resources',
    label: 'Resources',

    // I outlined future sections of our "Resources" page below (formerly "Tools") -Ian
    links: [
      { link: '/resources/benefits-estimator', label: 'Benefits Estimator' },
      { link: '/resources/data-sources', label: 'Data Sources '},
      // { link: '/resources/github', label: 'GitHub' },
      // { link: '/resources/tutorial', label: 'Tutorial' },
    ],
  },
  // { link: '/scratch', label: 'Scratch' }, // For zoning rules filter development
  // I outlined future sections of our "About" page below -Ian
  {
    link: '/about',
    label: 'About',
    links: [
      // { link: '/about/team', label: 'Team' },
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
    const isActive = (link: string) =>
      pathname === link || pathname.startsWith(link + '/');

    const menuItems = link.links?.map((item) => (
      <Menu.Item key={item.link} component={Link} href={item.link}>
        {item.label}
      </Menu.Item>
    ));

    const active = isActive(link.link);

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
