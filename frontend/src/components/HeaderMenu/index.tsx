'use client';

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
  {
    link: '/data-viewer',
    label: 'Data Viewer',
  },
  { link: '/save', label: 'Working Report' },
  { link: '/data-export', label: 'Raw Data Export' },
  { link: '/scratch', label: 'Scratch' },
];

export default function HeaderMenu() {
  const [opened, { toggle }] = useDisclosure(false);

  const items = links.map((link) => {
    const menuItems = link.links?.map((item) => (
      <Menu.Item key={item.link} component={Link} href={item.link}>
        {item.label}
      </Menu.Item>
    ));

    if (menuItems) {
      return (
        <Menu
          key={link.label}
          trigger="hover"
          transitionProps={{ exitDuration: 0 }}
          withinPortal
        >
          <Menu.Target>
            <Link href={link.link} className={classes.link}>
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
      <Link href={link.link} key={link.link} className={classes.link}>
        <UnstyledButton style={{ display: 'flex', alignItems: 'center' }}>
          <span className={classes.linkLabel}>{link.label}</span>
        </UnstyledButton>
      </Link>
    );
  });

  return (
    <header className={classes.header}>
      <Container size="md">
        <div className={classes.inner}>
          <Group gap={5} visibleFrom="sm">
            {items}
          </Group>
          <Burger opened={opened} onClick={toggle} size="sm" hiddenFrom="sm" />
        </div>
      </Container>
    </header>
  );
}
