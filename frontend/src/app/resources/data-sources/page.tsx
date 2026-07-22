/**
 * @author Ian Sargent
 * @since 2026-07-22
 *
 * @description
 *   code for the Data Sources page.
 */

'use client';

import { useState, useMemo } from 'react';

import {
  Button,
  Box,
  Card,
  Container,
  Divider,
  Drawer,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';

import { ArrowLeftIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import * as motion from 'motion/react-client';
import { DATA_SOURCES } from './source_description';

const COLOR = {
  spruce: '#1B3A2F',
  spruceDeep: '#122820',
  slate: '#40525A',
  birch: '#F6F5EF',
  amberSoft: '#E7B563',
  line: 'rgba(27, 58, 47, 0.14)',
};

const FONT_DISPLAY = "'Fraunces', 'Iowan Old Style', serif";
const FONT_BODY = "'General Sans', 'Inter', sans-serif";
const FONT_MONO = "'IBM Plex Mono', ui-monospace, monospace";

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------

function DataSourcesHero() {
  return (
    <Box
      style={{
        background: `linear-gradient(160deg, ${COLOR.spruceDeep}, ${COLOR.spruce})`,
        padding: '70px 0 50px',
      }}
    >
      <Container size="xl">
        <Text
          style={{
            fontFamily: FONT_MONO,
            fontSize: 12,
            letterSpacing: '0.14em',
            color: COLOR.amberSoft,
          }}
        >
          RESOURCES
        </Text>

        <Title
          order={1}
          mt="md"
          style={{
            fontFamily: FONT_DISPLAY,
            color: COLOR.birch,
            fontSize: 'clamp(2.3rem,5vw,3.7rem)',
          }}
        >
          Data Sources
        </Title>

        <Text
          mt="md"
          maw={650}
          size="lg"
          style={{
            color: 'rgba(246,245,239,.7)',
            fontFamily: FONT_BODY,
          }}
        >
          Explore the datasets powering Vermont community insights.
        </Text>
      </Container>
    </Box>
  );
}

function SearchDatasets({
  value,
  onChange,
}: {
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}) {
  return (
    <TextInput
      value={value}
      onChange={onChange}
      size="lg"
      radius="xl"
      placeholder="Search datasets, variables, or sources..."
      rightSection={<MagnifyingGlassIcon size={18} />}
      styles={{
        input: {
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderColor: COLOR.line,
          backdropFilter: 'blur(8px)',
        },
      }}
    />
  );
}

function CategoryCard({
  category,
  onClick,
}: {
  category: Category;
  onClick: () => void;
}) {
  const Icon = category.icon;

  return (
    <motion.div
      whileHover={{
        y: -8,
        scale: 1.02,
      }}
      whileTap={{
        scale: 0.98,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
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
        p="xl"
        h="100%"
        style={{
          transition: 'box-shadow 200ms ease',
        }}
      >
        <Stack align="center">
          <Icon size={75} weight="fill" style={{ color: COLOR.spruce }} />
          <Title
            order={3}
            ta="center"
            style={{
              fontFamily: FONT_DISPLAY,
            }}
          >
            {category.name}
          </Title>
          <Text ta="center" size="sm" c="dimmed">
            {category.summary}
          </Text>
          <Text size="sm" fw={500}>
            {category.datasets.length} dataset(s)
          </Text>
        </Stack>
      </Card>
    </motion.div>
  );
}

function DatasetCard({
  dataset,
  onClick,
}: {
  dataset: Dataset;
  onClick: () => void;
}) {
  return (
    <Card
      withBorder
      radius="lg"
      p="lg"
      style={{
        cursor: 'pointer',
        borderColor: COLOR.spruce,
        borderWidth: 0.75,
      }}
      onClick={onClick}
    >
      <Title
        order={3}
        style={{
          fontFamily: FONT_DISPLAY,
        }}
      >
        {dataset.name}
      </Title>
      <Text size="sm" c="dimmed" mt="xs">
        {dataset.summary}
      </Text>
      <Divider my="md" />
      <Text size="sm" fw={700}>
        Source
      </Text>
      <Text size="sm" c="dimmed">
        {dataset.source}
      </Text>
    </Card>
  );
}

function VariableTable({ variables }: { variables: Variable[] }) {
  return (
    <Table striped>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Variable</Table.Th>
          <Table.Th>Description</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {variables.map((variable) => (
          <Table.Tr key={variable.name}>
            <Table.Td>{variable.name}</Table.Td>
            <Table.Td>{variable.description}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

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
    <Drawer opened={opened} onClose={onClose} position="bottom" size="lg">
      {dataset ? (
        <Stack>
          <Button
            variant="transparent"
            justify="flex-start"
            leftSection={<ArrowLeftIcon size={20} />}
            style={{
              width: 250,
            }}
            size="sm"
            onClick={onBack}
          >
            Back to datasets
          </Button>

          <Stack gap={5}>
            <Title
              order={2}
              style={{
                fontFamily: FONT_DISPLAY,
                color: COLOR.spruceDeep,
              }}
            >
              {dataset.name}
            </Title>
            <Text size="xs" c="dimmed">
              {dataset.source}
            </Text>
          </Stack>
          <Text c="dimmed">{dataset.summary}</Text>
          <Title order={3}>Variables</Title>
          <ScrollArea>
            <VariableTable variables={dataset.variables} />
          </ScrollArea>
        </Stack>
      ) : (
        <Stack>
          <Title
            order={2}
            style={{
              color: COLOR.spruceDeep,
              fontFamily: FONT_BODY,
            }}
          >
            {category?.name} Datasets
          </Title>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
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
      return { ...category, datasets };
    }).filter((category) => category.datasets.length > 0);
  }, [search]);

  return (
    <Box>
      <DataSourcesHero />
      <Container size="xl" py={50}>
        <SearchDatasets
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
        <SimpleGrid
          cols={{
            base: 1,
            sm: 2,
            lg: 3,
          }}
          mt={50}
          spacing="xl"
        >
          {filteredCategories.map((category) => (
            <CategoryCard
              key={category.name}
              category={category}
              onClick={() => setSelectedCategory(category)}
            />
          ))}
        </SimpleGrid>
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
