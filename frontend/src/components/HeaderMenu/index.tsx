'use client';

import { usePathname } from 'next/navigation';
import { IconChevronDown } from '@tabler/icons-react';
import {
  UnstyledButton,
  Burger,
  Center,
  Container,
  Group,
  Menu,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import classes from './HeaderMenu.module.css';
import Link from 'next/link';
import { ProfileModal } from '../profile/SetProfile';

const links = [
  { link: '/', label: 'Home' },
  {
    link: '/mapping',
    label: 'Exploratory Mapping',
    links: [
      { link: '/mapping/zoning', label: 'Zoning' },
      { link: '/mapping/soil-suitability', label: 'Soil Suitability' },
      { link: '/mapping/flood-legal', label: 'Flood Insurance' },
    ],
  },
  // { link: '/data-viewer', label: 'Data Analysis' }, // accessible via Working Report
  {
    link: '/data-comparison',
    label: 'Data Comparison',
    links: [
      {
        link: '/data-comparison/dp-explorer',
        label: 'Data Profile Comparison',
      },
      { link: '/data-comparison/b-tables', label: 'Detailed Table Comparison' },
    ],
  },
  { link: '/working-report', label: 'Working Report' },
  { link: '/data-export', label: 'Data Export' },
  {
    link: '/tools',
    label: 'Tools',
    links: [{ link: '/tools/benefits-estimator', label: 'Benefits Estimator' }],
  },
  // { link: '/scratch', label: 'Scratch' },
  // { link: '/about', label: 'About' },
];

export default function HeaderMenu() {
  const pathname = usePathname(); /* Get the current pathname */

  const [opened, { toggle }] = useDisclosure(false);

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
          transitionProps={{ exitDuration: 0 }}
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
    <header className={classes.header}>
      <Container size="xl">
        <div className={classes.inner}>
          <Group gap={5} visibleFrom="sm">
            <ProfileModal />
            {items}
          </Group>
          <Burger opened={opened} onClick={toggle} size="sm" hiddenFrom="sm" />
        </div>
      </Container>
    </header>
  );
}
