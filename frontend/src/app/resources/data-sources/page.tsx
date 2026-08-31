'use client';

import { useMemo, useState } from 'react';
import {
  Category,
  Dataset,
  Variable,
  DATA_SOURCES,
} from './source_description';

import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Drawer,
  Group,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  DatabaseIcon,
  MagnifyingGlassIcon,
} from '@phosphor-icons/react';

import * as motion from 'motion/react-client';

import { COLORS, FONTS } from '@/app/theme';

// -----------------------------------------------------------------------------
// Hero
// -----------------------------------------------------------------------------

function DataSourcesHero() {
  const datasetCount = DATA_SOURCES.reduce(
    (total, category) => total + category.datasets.length,
    0,
  );

  const variableCount = DATA_SOURCES.reduce(
    (total, category) =>
      total +
      category.datasets.reduce(
        (datasetTotal, dataset) => datasetTotal + dataset.variables.length,
        0,
      ),
    0,
  );

  return (
    <Box
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(145deg, ${COLORS.spruceDeep} 0%, ${COLORS.spruce} 100%)`,
      }}
      pt={{ base: 55, sm: 75 }}
      pb={{ base: 45, sm: 60 }}
    >
      {/* Decorative grid */}
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.07,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)
          `,
          backgroundSize: '42px 42px',
          maskImage: 'linear-gradient(to bottom, black, transparent 85%)',
          pointerEvents: 'none',
        }}
      />

      {/* Large decorative mark */}
      <Text
        aria-hidden
        style={{
          position: 'absolute',
          right: '-30px',
          top: '-80px',
          fontFamily: FONTS.display,
          fontSize: 'clamp(14rem, 30vw, 28rem)',
          lineHeight: 1,
          color: 'rgba(255,255,255,.035)',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        ∞
      </Text>

      <Container size="xl" style={{ position: 'relative' }}>
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
            DATA CATALOG
          </Text>
        </Group>

        <Title
          order={1}
          style={{
            fontFamily: FONTS.display,
            color: COLORS.birch,
            fontSize: 'clamp(2.8rem, 6vw, 5rem)',
            lineHeight: 0.98,
            maxWidth: 850,
            letterSpacing: '-0.025em',
          }}
        >
          The data behind
          <br />
          Vermont insights.
        </Title>

        <Text
          mt="xl"
          maw={680}
          size="lg"
          style={{
            color: 'rgba(246,245,239,.72)',
            fontFamily: FONTS.body,
            fontSize: 'clamp(1rem, 2vw, 1.2rem)',
            lineHeight: 1.7,
          }}
        >
          Explore the datasets, sources, and detailed variable descriptions that
          allow for accessible analysis.
        </Text>

        <Group mt={35} gap={35}>
          <Stack gap={2}>
            <Text
              style={{
                fontFamily: FONTS.display,
                color: COLORS.birch,
                fontSize: 28,
              }}
            >
              {DATA_SOURCES.length}
            </Text>
            <Text
              size="xs"
              style={{
                fontFamily: FONTS.mono,
                color: 'rgba(246,245,239,.55)',
                textTransform: 'uppercase',
                letterSpacing: '.08em',
              }}
            >
              Categories
            </Text>
          </Stack>

          <Stack gap={2}>
            <Text
              style={{
                fontFamily: FONTS.display,
                color: COLORS.birch,
                fontSize: 28,
              }}
            >
              {datasetCount}
            </Text>
            <Text
              size="xs"
              style={{
                fontFamily: FONTS.mono,
                color: 'rgba(246,245,239,.55)',
                textTransform: 'uppercase',
                letterSpacing: '.08em',
              }}
            >
              Datasets
            </Text>
          </Stack>

          <Stack gap={2}>
            <Text
              style={{
                fontFamily: FONTS.display,
                color: COLORS.birch,
                fontSize: 28,
              }}
            >
              {variableCount}
            </Text>
            <Text
              size="xs"
              style={{
                fontFamily: FONTS.mono,
                color: 'rgba(246,245,239,.55)',
                textTransform: 'uppercase',
                letterSpacing: '.08em',
              }}
            >
              Variables
            </Text>
          </Stack>
        </Group>
      </Container>
    </Box>
  );
}

// -----------------------------------------------------------------------------
// Search
// -----------------------------------------------------------------------------

function SearchDatasets({
  value,
  onChange,
}: {
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}) {
  return (
    <Box
      style={{
        position: 'relative',
        marginTop: -28,
        zIndex: 2,
      }}
    >
      <TextInput
        value={value}
        onChange={onChange}
        size="lg"
        radius="md"
        placeholder="Search datasets, variables, or sources..."
        leftSection={<MagnifyingGlassIcon size={19} />}
        rightSection={
          value ? (
            <Text size="xs" c="dimmed" style={{ fontFamily: FONTS.mono }}>
              ESC
            </Text>
          ) : null
        }
        styles={{
          input: {
            height: 64,
            paddingLeft: 50,
            backgroundColor: COLORS.birch,
            border: `1px solid ${COLORS.line}`,
            boxShadow: '0 12px 35px rgba(20, 35, 25, .12)',
            fontFamily: FONTS.body,
            fontSize: 16,
          },

          section: {
            width: 48,
          },
        }}
      />
    </Box>
  );
}

// -----------------------------------------------------------------------------
// Category Card
// -----------------------------------------------------------------------------

function CategoryCard({
  category,
  index,
  onClick,
}: {
  category: Category;
  index: number;
  onClick: () => void;
}) {
  const Icon = category.icon;

  return (
    <motion.div
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.99 }}
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 25,
      }}
      style={{
        height: '100%',
        cursor: 'pointer',
      }}
      onClick={onClick}
    >
      <Card
        withBorder
        radius="lg"
        p={0}
        h="100%"
        style={{
          overflow: 'hidden',
          borderColor: COLORS.line,
          background: COLORS.birch,
          transition: 'box-shadow 200ms ease, border-color 200ms ease',
        }}
      >
        <Box p="xl">
          <Group justify="space-between" align="flex-start">
            <ThemeIcon
              size={62}
              radius="md"
              variant="light"
              style={{
                backgroundColor: COLORS.birchDim,
                color: COLORS.spruce,
              }}
            >
              <Icon size={31} weight="duotone" />
            </ThemeIcon>

            <Text
              style={{
                fontFamily: FONTS.mono,
                fontSize: 12,
                color: COLORS.slate,
              }}
            >
              {String(index + 1).padStart(2, '0')}
            </Text>
          </Group>

          <Title
            order={3}
            mt="xl"
            style={{
              fontFamily: FONTS.display,
              fontSize: 26,
              color: COLORS.ink,
            }}
          >
            {category.name}
          </Title>

          <Text
            mt="xs"
            size="sm"
            c="dimmed"
            style={{
              lineHeight: 1.65,
              maxWidth: 390,
            }}
          >
            {category.summary}
          </Text>
        </Box>

        <Divider />

        <Group
          justify="space-between"
          px="xl"
          py="md"
          style={{
            background: COLORS.birchDim,
          }}
        >
          <Text
            size="xs"
            style={{
              fontFamily: FONTS.mono,
              color: COLORS.slate,
              textTransform: 'uppercase',
              letterSpacing: '.06em',
            }}
          >
            {category.datasets.length}{' '}
            {category.datasets.length === 1 ? 'dataset' : 'datasets'}
          </Text>

          <ArrowRightIcon
            size={18}
            style={{
              color: COLORS.amber,
            }}
          />
        </Group>
      </Card>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Dataset Card
// -----------------------------------------------------------------------------

function DatasetCard({
  dataset,
  onClick,
}: {
  dataset: Dataset;
  onClick: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18 }}
      style={{ height: '100%' }}
    >
      <Card
        withBorder
        radius="md"
        p="lg"
        h="100%"
        onClick={onClick}
        style={{
          cursor: 'pointer',
          borderColor: COLORS.line,
          background: COLORS.birch,
        }}
      >
        <Group justify="space-between" align="flex-start">
          <ThemeIcon
            size={38}
            radius="sm"
            variant="light"
            style={{
              backgroundColor: COLORS.birchDim,
              color: COLORS.spruce,
            }}
          >
            <DatabaseIcon size={19} />
          </ThemeIcon>

          <ArrowRightIcon
            size={18}
            style={{
              color: COLORS.slate,
            }}
          />
        </Group>

        <Title
          order={3}
          mt="lg"
          style={{
            fontFamily: FONTS.display,
            fontSize: 22,
          }}
        >
          {dataset.name}
        </Title>

        <Text size="sm" c="dimmed" mt="xs" style={{ lineHeight: 1.6 }}>
          {dataset.summary}
        </Text>

        <Box mt="lg">
          <Text
            size="xs"
            fw={700}
            style={{
              fontFamily: FONTS.mono,
              textTransform: 'uppercase',
              letterSpacing: '.08em',
            }}
          >
            Source
          </Text>

          <Text size="sm" c="dimmed" mt={3}>
            {dataset.source}
          </Text>
        </Box>

        <Group mt="lg" gap="xs">
          <Badge
            variant="light"
            radius="sm"
            style={{
              backgroundColor: COLORS.birchDim,
              color: COLORS.spruceDeep,
            }}
          >
            {dataset.variables.length} variables
          </Badge>
        </Group>
      </Card>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Variable Table
// -----------------------------------------------------------------------------

function VariableTable({ variables }: { variables: Variable[] }) {
  return (
    <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Variable</Table.Th>
          <Table.Th>Description</Table.Th>
        </Table.Tr>
      </Table.Thead>

      <Table.Tbody>
        {variables.map((variable) => (
          <Table.Tr key={variable.name}>
            <Table.Td
              style={{
                fontFamily: FONTS.mono,
                fontSize: 13,
                whiteSpace: 'nowrap',
              }}
            >
              {variable.name}
            </Table.Td>

            <Table.Td
              style={{
                fontFamily: FONTS.body,
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              {variable.description}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

// -----------------------------------------------------------------------------
// Dataset Drawer
// -----------------------------------------------------------------------------

function DatasetDrawer({
  category,
  dataset,
  opened,
  onClose,
  onDatasetSelect,
  onBack,
}: {
  category: Category | null;
  dataset: Dataset | null;
  opened: boolean;
  onClose: () => void;
  onDatasetSelect: (dataset: Dataset) => void;
  onBack: () => void;
}) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="bottom"
      size="xl"
      radius="xl"
      title={
        dataset ? 'Dataset details' : `${category?.name ?? 'Category'} datasets`
      }
      styles={{
        header: {
          borderBottom: `1px solid ${COLORS.line}`,
        },

        title: {
          fontFamily: FONTS.mono,
          fontSize: 12,
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          color: COLORS.slate,
        },

        body: {
          backgroundColor: COLORS.birch,
        },
      }}
    >
      {dataset ? (
        <Stack gap="xl">
          <Button
            variant="subtle"
            justify="flex-start"
            leftSection={<ArrowLeftIcon size={18} />}
            style={{
              width: 'fit-content',
              color: COLORS.spruceDeep,
              paddingLeft: 0,
            }}
            onClick={onBack}
          >
            Back to datasets
          </Button>

          <Box>
            <Group gap="sm" mb="sm">
              <Badge
                variant="light"
                style={{
                  backgroundColor: COLORS.birchDim,
                  color: COLORS.spruceDeep,
                }}
              >
                Dataset
              </Badge>

              <Text size="xs" c="dimmed">
                {dataset.variables.length} variables
              </Text>
            </Group>

            <Title
              order={2}
              style={{
                fontFamily: FONTS.display,
                color: COLORS.spruceDeep,
                fontSize: 'clamp(2rem, 4vw, 3rem)',
              }}
            >
              {dataset.name}
            </Title>

            <Text
              mt="xs"
              size="sm"
              c="dimmed"
              style={{
                fontFamily: FONTS.mono,
              }}
            >
              {dataset.source}
            </Text>
          </Box>

          <Text
            size="md"
            maw={850}
            style={{
              lineHeight: 1.75,
            }}
          >
            {dataset.summary}
          </Text>

          <Divider />

          <Box>
            <Title
              order={3}
              style={{
                fontFamily: FONTS.display,
                fontSize: 25,
              }}
            >
              Variables
            </Title>

            <Text size="sm" c="dimmed" mt={4} mb="lg">
              Fields available in this dataset.
            </Text>

            <ScrollArea>
              <VariableTable variables={dataset.variables} />
            </ScrollArea>
          </Box>
        </Stack>
      ) : (
        <Stack gap="xl">
          <Box>
            <Title
              order={2}
              style={{
                color: COLORS.spruceDeep,
                fontFamily: FONTS.display,
                fontSize: 32,
              }}
            >
              {category?.name}
            </Title>

            <Text size="sm" c="dimmed" mt={4}>
              {category?.summary}
            </Text>
          </Box>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {category?.datasets.map((dataset) => (
              <DatasetCard
                key={dataset.name}
                dataset={dataset}
                onClick={() => onDatasetSelect(dataset)}
              />
            ))}
          </SimpleGrid>
        </Stack>
      )}
    </Drawer>
  );
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default function DataSourcesPage() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );

  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);

  const [search, setSearch] = useState('');

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return DATA_SOURCES;

    const query = search.toLowerCase();

    return DATA_SOURCES.map((category) => {
      const datasets = category.datasets.filter((dataset) => {
        return (
          category.name.toLowerCase().includes(query) ||
          category.summary.toLowerCase().includes(query) ||
          dataset.name.toLowerCase().includes(query) ||
          dataset.summary.toLowerCase().includes(query) ||
          dataset.source.toLowerCase().includes(query) ||
          dataset.variables.some(
            (variable) =>
              variable.name.toLowerCase().includes(query) ||
              variable.description.toLowerCase().includes(query),
          )
        );
      });

      return {
        ...category,
        datasets,
      };
    }).filter((category) => category.datasets.length > 0);
  }, [search]);

  const totalResults = filteredCategories.reduce(
    (total, category) => total + category.datasets.length,
    0,
  );

  return (
    <Box
      style={{
        minHeight: '100vh',
        backgroundColor: COLORS.birchDim,
      }}
    >
      <DataSourcesHero />

      <Container size="xl">
        <SearchDatasets
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />

        <Group justify="space-between" align="flex-end" mt={60} mb={25}>
          <Box>
            <Text
              style={{
                fontFamily: FONTS.mono,
                fontSize: 12,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: COLORS.amber,
              }}
            >
              Explore the catalog
            </Text>

            <Title
              order={2}
              mt={5}
              style={{
                fontFamily: FONTS.display,
                color: COLORS.ink,
                fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
              }}
            >
              Browse by topic
            </Title>
          </Box>

          {search && (
            <Text size="sm" c="dimmed">
              {totalResults} {totalResults === 1 ? 'dataset' : 'datasets'} found
            </Text>
          )}
        </Group>

        {filteredCategories.length > 0 ? (
          <SimpleGrid
            cols={{
              base: 1,
              sm: 2,
              lg: 3,
            }}
            spacing="lg"
            pb={80}
          >
            {filteredCategories.map((category, index) => (
              <CategoryCard
                key={category.name}
                category={category}
                index={index}
                onClick={() => {
                  setSelectedCategory(category);
                  setSelectedDataset(null);
                }}
              />
            ))}
          </SimpleGrid>
        ) : (
          <Box
            py={100}
            ta="center"
            style={{
              border: `1px dashed ${COLORS.line}`,
              borderRadius: 16,
              backgroundColor: COLORS.birch,
            }}
          >
            <MagnifyingGlassIcon
              size={40}
              style={{
                color: COLORS.slate,
                opacity: 0.6,
              }}
            />

            <Title
              order={3}
              mt="md"
              style={{
                fontFamily: FONTS.display,
              }}
            >
              No datasets found
            </Title>

            <Text size="sm" c="dimmed" mt="xs">
              Try searching for a different dataset, source, or variable.
            </Text>

            <Button
              variant="subtle"
              mt="lg"
              onClick={() => setSearch('')}
              style={{
                color: COLORS.spruceDeep,
              }}
            >
              Clear search
            </Button>
          </Box>
        )}
      </Container>

      <DatasetDrawer
        category={selectedCategory}
        dataset={selectedDataset}
        opened={!!selectedCategory}
        onDatasetSelect={(dataset) => setSelectedDataset(dataset)}
        onBack={() => setSelectedDataset(null)}
        onClose={() => {
          setSelectedCategory(null);
          setSelectedDataset(null);
        }}
      />
    </Box>
  );
}
