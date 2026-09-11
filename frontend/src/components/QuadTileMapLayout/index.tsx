'use client';
import { ReactNode } from 'react';
import { Paper, ScrollArea, Title, Divider, Stack, Text } from '@mantine/core';
import { IconChartBar } from '@tabler/icons-react';
import { COLORS, FONTS } from '@/app/theme';
import classes from './QuadTileMapLayout.module.css';

interface QuadMapLayoutProps {
  title: string;
  sidebar: ReactNode;
  map: ReactNode;
  tiles: ReactNode[];
}

const panelStyle = {
  borderColor: COLORS.line,
  backgroundColor: '#fff',
};

export default function QuadTileMapLayout({
  title,
  sidebar,
  map,
  tiles,
}: QuadMapLayoutProps) {
  const visibleTiles = tiles.filter(Boolean);

  return (
    <div className={classes.wrapper}>
      <div className={classes.grid}>
        {/* Sidebar Column */}
        <div className={classes.column}>
          <Paper
            withBorder
            shadow="sm"
            radius="lg"
            p="md"
            className={classes.panel}
            style={panelStyle}
          >
            <ScrollArea h="100%" offsetScrollbars type="auto">
              <Title
                order={4}
                mb={2}
                style={{ fontFamily: FONTS.display, color: COLORS.spruce }}
              >
                {title}
              </Title>
              <Divider mb="sm" color={COLORS.line} />
              {sidebar}
            </ScrollArea>
          </Paper>
        </div>

        {/* Map Column */}
        <div className={classes.column}>
          <Paper
            withBorder
            shadow="sm"
            radius="lg"
            className={classes.mapPanel}
            style={panelStyle}
          >
            {map}
          </Paper>
        </div>

        {/* Chart / Side Content Column */}
        <div className={classes.column}>
          <Paper
            withBorder
            shadow="sm"
            radius="lg"
            p="md"
            className={classes.panel}
            style={panelStyle}
          >
            <ScrollArea h="100%" offsetScrollbars type="auto">
              <Title
                order={5}
                mb={2}
                style={{ fontFamily: FONTS.display, color: COLORS.spruce }}
              >
                Insights
              </Title>
              <Divider mb="sm" color={COLORS.line} />
              {visibleTiles.length > 0 ? (
                <Stack gap="md">
                  {visibleTiles.map((tile, i) => (
                    <div key={i}>{tile}</div>
                  ))}
                </Stack>
              ) : (
                <div className={classes.emptyTiles}>
                  <Stack gap={6} align="center">
                    <IconChartBar size={28} color={COLORS.slate} />
                    <Text size="sm" c="dimmed">
                      Charts will appear here once data is loaded.
                    </Text>
                  </Stack>
                </div>
              )}
            </ScrollArea>
          </Paper>
        </div>
      </div>
    </div>
  );
}
