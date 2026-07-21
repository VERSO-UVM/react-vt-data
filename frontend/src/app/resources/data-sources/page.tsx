'use client';

import { useState } from 'react';

import {
  Box,
  Card,
  Container,
  Divider,
  Drawer,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';

import {
  HeartbeatIcon,
  MapTrifoldIcon,
  BriefcaseIcon,
  HouseIcon,
  GraduationCapIcon,
  DropIcon,
  UsersThreeIcon,
  Icon,
} from '@phosphor-icons/react';
import * as motion from "motion/react-client"

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
// Types
// -----------------------------------------------------------------------------

type Variable = {
  name: string;
  description: string;
  datatype?: string;
  key?: boolean;
};

type Dataset = {
  name: string;
  summary: string;
  source: string;
  updated: string;
  icon: Icon;
  variables: Variable[];
};

type Category = {
  name: string;
  summary: string;
  icon: Icon;
  datasets: Dataset[];
};


// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

const DATA_SOURCES: Category[] = [
  {
    name: "Community Health",
    summary:
      "Community health indicators describing health outcomes, behaviors, and access to care.",
    icon: HeartbeatIcon,

    datasets: [
      {
        name: "Community Health Indicators",
        summary:
          "Model-based estimates of chronic disease prevalence, health behaviors, and preventive care measures for Vermont communities.",
        source:
          "Centers for Disease Control and Prevention (CDC) PLACES",
        updated: "2024",
        icon: HeartbeatIcon,

        variables: [
          {
            name: "Adult Obesity",
            description:
              "Estimated percentage of adults classified as obese.",
            datatype: "Percentage",
            key: true,
          },
          {
            name: "Diabetes",
            description:
              "Estimated percentage of adults diagnosed with diabetes.",
            datatype: "Percentage",
            key: true,
          },
          {
            name: "Physical Inactivity",
            description:
              "Estimated percentage of adults reporting no leisure-time physical activity.",
            datatype: "Percentage",
            key: true,
          },
          {
            name: "Current Smoking",
            description:
              "Estimated percentage of adults who currently smoke cigarettes.",
            datatype: "Percentage",
            key: true,
          },
        ],
      },
    ],
  },

  {
    name: "Land Use",
    summary:
      "Municipal zoning districts and land-use regulations standardized across Vermont.",
    icon: MapTrifoldIcon,

    datasets: [
      {
        name: "Municipal Zoning",
        summary:
          "Standardized zoning districts and regulations collected from Vermont municipalities.",
        source:
          "UVM VERSO Zoning Atlas Pod",
        updated: "2026",
        icon: MapTrifoldIcon,

        variables: [
          {
            name: "District Name",
            description:
              "Official municipal zoning district designation.",
            datatype: "String",
            key: true,
          },
          {
            name: "Allowed Uses",
            description:
              "Permitted and conditional land uses within each district.",
            datatype: "String",
            key: true,
          },
          {
            name: "Minimum Lot Size",
            description:
              "Minimum parcel size required for development.",
            datatype: "Numeric",
            key: true,
          },
          {
            name: "Building Height",
            description:
              "Maximum allowable building height.",
            datatype: "Numeric",
            key: true,
          },
        ],
      },
    ],
  },

  {
    name: "Labor & Economy",
    summary:
      "Employment, income, wages, and industry trends across Vermont communities.",
    icon: BriefcaseIcon,

    datasets: [
      {
        name: "Employment & Economic Indicators",
        summary:
          "Employment, income, labor force, and industry statistics from Census and BLS sources.",
        source:
          "U.S. Census Bureau ACS5 & Bureau of Labor Statistics QCEW",
        updated: "2024",
        icon: BriefcaseIcon,

        variables: [
          {
            name: "Median Household Income",
            description:
              "Median annual household income reported by ACS.",
            datatype: "Currency",
            key: true,
          },
          {
            name: "Unemployment Rate",
            description:
              "Unemployment rate among the civilian labor force.",
            datatype: "Percentage",
            key: true,
          },
          {
            name: "Employment by Sector",
            description:
              "Employment counts by NAICS industry sector.",
            datatype: "Count",
            key: true,
          },
          {
            name: "Per Capita Income",
            description:
              "Average annual income per person.",
            datatype: "Currency",
            key: true,
          },
        ],
      },
    ],
  },

  {
    name: "Housing",
    summary:
      "Housing characteristics, affordability, occupancy, and tenure information.",
    icon: HouseIcon,
    datasets: [],
  },

  {
    name: "Education",
    summary:
      "Educational attainment and enrollment characteristics.",
    icon: GraduationCapIcon,
    datasets: [],
  },

  {
    name: "Environment",
    summary:
      "Environmental hazards and natural resource datasets.",
    icon: DropIcon,
    datasets: [],
  },
  {
    name: "Demographics & Population",
    summary:
      "Demographic characteristics, population estimates, sex, and race information.",
    icon: UsersThreeIcon,
    datasets: [],
  },
];


// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------

function DataSourcesHero() {
  return (
    <Box
      style={{
        background:
          `linear-gradient(160deg, ${COLOR.spruceDeep}, ${COLOR.spruce})`,
        padding: "70px 0 50px",
      }}
    >
      <Container size="xl">
        <Text
          style={{
            fontFamily: FONT_MONO,
            fontSize: 12,
            letterSpacing: "0.14em",
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
            fontSize:
              "clamp(2.3rem,5vw,3.7rem)",
          }}
        >
          Data Sources
        </Title>

        <Text
          mt="md"
          maw={650}
          size="lg"
          style={{
            color: "rgba(246,245,239,.7)",
            fontFamily: FONT_BODY,
          }}
        >
          Explore the datasets powering Vermont
          community insights.
        </Text>

      </Container>
    </Box>
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
        type: "spring",
        stiffness: 300,
        damping: 20,
      }}
      style={{
        height: "100%",
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      <Card
        withBorder
        radius="xl"
        p="xl"
        h="100%"
        style={{
          transition:
            "box-shadow 200ms ease",
        }}
      >
        <Stack align="center">
          <Icon size={75} weight="fill" style={{color: COLOR.spruce}}/>
          <Title
            order={3}
            ta="center"
            style={{
              fontFamily: FONT_DISPLAY,
            }}
          >
            {category.name}
          </Title>
          <Text
            ta="center"
            size="sm"
            c="dimmed"
          >
            {category.summary}
          </Text>
          <Text
            size="sm"
            fw={500}
          >
            {category.datasets.length} dataset(s)
          </Text>
        </Stack>
      </Card>
    </motion.div>
  );
}

function DatasetCard({
  dataset,
}: {
  dataset: Dataset;
}) {

  return (
    <Card
      withBorder
      radius="lg"
      p="lg"
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

      <Text size="sm">
        Source: {dataset.source}
      </Text>

      <Text size="sm">
        Updated: {dataset.updated}
      </Text>

    </Card>
  );
}


function VariableTable({
  variables,
}: {
  variables: Variable[];
}) {

  return (
    <Table striped>

      <Table.Thead>
        <Table.Tr>
          <Table.Th>
            Variable
          </Table.Th>

          <Table.Th>
            Type
          </Table.Th>

          <Table.Th>
            Description
          </Table.Th>
        </Table.Tr>
      </Table.Thead>


      <Table.Tbody>

        {variables.map((variable) => (
          <Table.Tr key={variable.name}>
            <Table.Td>
              {variable.name}
            </Table.Td>
            <Table.Td>
              {variable.datatype}
            </Table.Td>
            <Table.Td>
              {variable.description}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}


function DatasetDrawer({
  category,
  opened,
  onClose,
}: {
  category: Category | null;
  opened: boolean;
  onClose: () => void;
}) {

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="bottom"
      size="md">
      {category && (
        <Stack>
          <Title style={{
            fontFamily: FONT_BODY
          }}>
            {`${category?.name} Datasets`}
          </Title>
          {category.datasets.length === 0 ? (
            <Text c="dimmed"> Dataset details coming soon.</Text>) : (
            category.datasets.map((dataset) => (
              <DatasetCard key={dataset.name} dataset={dataset}/>
            ))
          )}
        </Stack>
      )}
    </Drawer>
  );
}


// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default function DataSourcesPage() {

  const [selectedCategory, setSelectedCategory] =
    useState<Category | null>(null);


  return (
    <Box>
      <DataSourcesHero />
      <Container size="xl" py={50}>
        <SimpleGrid
          cols={{
            base: 1,
            sm: 2,
            lg: 3,
          }}
          spacing="xl"
        >
          {DATA_SOURCES.map((category) => (
            <CategoryCard
              key={category.name}
              category={category}
              onClick={() =>
                setSelectedCategory(category)
              }
            />
          ))}
        </SimpleGrid>
      </Container>
      <DatasetDrawer
        category={selectedCategory}
        opened={!!selectedCategory}
        onClose={() =>
          setSelectedCategory(null)
        }
      />
    </Box>
  );
}