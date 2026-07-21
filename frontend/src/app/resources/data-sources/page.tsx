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
  key? : boolean;
};

type Dataset = {
  name: string;
  summary: string;
  source: string;
  updated: string;
  icon: Icon;
  variables: Variable[];
  href?: string;
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
    summary: "Community health indicators describing health outcomes, behaviors, and access to care.",
    icon: HeartbeatIcon,

    datasets: [
      {
        name: "Community Health Indicators",
        summary: "Small-area estimates of health outcomes, risk behaviors, social needs, and more for Vermont counties and census tracts.",
        source: "Centers for Disease Control and Prevention (CDC) PLACES.",
        updated: "2024",
        icon: HeartbeatIcon,

        variables: [
          {
            name: "Cancer or Melanoma",
            description:
              "Probability of having non-skin cancer or melanoma.",
            key: true,
          },
          {
            name: "High Blood Pressure",
            description:
              "Probability among adults who report ever having been told by a doctor, nurse, or other health professional that they have high blood pressure.",
            key: true,
          },
          {
            name: "Current Cigarette Smoking",
            description:
              "Probability among adults who report having smoked ≥ 100 cigarettes in their lifetime and currently smoke every day or some days.",
            key: true,
          },
          {
            name: "Frequent Mental Distress",
            description:
              "Probability among adults who reported 14 or more days, during the past 30 days, that their physical health (including physical illness and injury) was not good.",
            key: true,
          },
          {
            name: "Hearing Disability",
            description:
              "Probability of having a hearing disability (reporting ‘yes’ to the question: “Are you deaf or do you have serious difficulty hearing?”).",
            key: true,
          },
          {
            name: "Vision Disability",
            description:
              "Probability of having a vision disability (reporting ‘yes’ to the question: “Are you blind or do you have serious difficulty seeing, even when wearing glasses?”).",
            key: true,
          },
          {
            name: "Feelings of Loneliness",
            description: "Probability among adults who report always/usually/sometimes feeling lonely.",
            key: true,
          },
          {
            name: "Receipt of Food Stamps",
            description: "Probability among adults who reported receiving food stamps, also called SNAP, the Supplemental Nutrition Assistance Program, on an EBT card.",
            key: true,
          },
          {
            name: "Food Insecurity",
            description: "Probability among adults who reported that the food that they bought always/usually/sometimes did not last, and they didn’t have money to get more.",
            key: true,
          },
          {
            name: "Housing Insecurity",
            description: "Probability among adults who were not able to pay mortgage, rent, or utility bill in the past 12 months.",
            key: true,
          },
          {
            name: "Lack of Reliable Transportation",
            description: "Probability among adults who reported a lack of reliable transportation keeping them from medical appointments, meetings, work, or from getting things needed for daily living in the past 12 months.",
            key: true,
          },
          {
            name: "Housing Cost Burden",
            description: "Households with annual income less than $75,000 that spend 30% or more of their household income on housing.",
            key: true,
          },
          {
            name: "Crowding Among Housing Units",
            description: "Occupied housing units with 1.01 to 1.50 and 1.51 or more occupants per room.",
            key: true,
          },
        ],
      },
      {
        name: "Health Insurance Coverage",
        summary: "Those with public, private, or no health insurance from Census ACS 5-year estimates.",
        source: "U.S. Census Bureau ACS 5-year Estimates (Table DP03)",
        updated: "2024",
        icon: BriefcaseIcon,
        
        variables: [
          {
            name: "Year",
            description: "",
            key: true,
          },
          {
            name: "Public Health Insurance",
            description: "Those with public health insurance coverage.",
            key: true,
          },
          {
            name: "Private Health Insurance",
            description: "Those with private health insurance coverage.",
            key: true,
          },
          {
            name: "No Health Insurance",
            description: "Those without health insurance coverage.",
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
            description: "Official municipal zoning district designation.",
            datatype: "String",
            key: true,
          },
          {
            name: "1-Family Allowance",
            description: "Permitted and conditional land uses within each district.",
            datatype: "String",
            key: true,
          },
          {
            name: "2-Family Allowance",
            description: "Permitted and conditional land uses within each district.",
            datatype: "String",
            key: true,
          },
          {
            name: "3-Family Allowance",
            description: "Permitted and conditional land uses within each district.",
            datatype: "String",
            key: true,
          },
          {
            name: "4+ Family Allowance",
            description: "Permitted and conditional land uses within each district.",
            datatype: "String",
            key: true,
          },
          {
            name: "Minimum Lot Size",
            description: "Minimum parcel size required for development.",
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
        name: "Selected Economic Characteristics",
        summary:
          "Employment, income, labor force, and industry statistics from Census ACS 5-year estimates.",
        source: "U.S. Census Bureau ACS 5-year Estimates (Table DP03)",
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
      {
        name: "Employment by Sector",
        summary:
          "Quarterly employment estimates by industry sector from the U.S. Bureau of Labor Statistics.",
        source: "U.S. Bureau of Labor Statistics, Quarterly Census of Employment and Wages (QCEW)",
        updated: "2024",
        icon: BriefcaseIcon,
        
        variables: [
          {
            name: "County",
            description: "",
            key: true,
          },
        ],
      },
      {
        name: "Unemployment Rate",
        summary: "Annual unemployment rate from Census ACS 5-year estimates.",
        source: "U.S. Census Bureau ACS 5-year Estimates (Table DP03)",
        updated: "2024",
        icon: BriefcaseIcon,
        
        variables: [
          {
            name: "Year",
            description: "",
            key: true,
          },
          {
            name: "Unemployment Rate",
            description: "Unemployment rate among the civilian labor force.",
            datatype: "Percentage",
            key: true,
          },
        ],
      },
      {
        name: "Median Earnings",
        summary: "Median annual earnings (USD) from Census ACS 5-year estimates.",
        source: "U.S. Census Bureau ACS 5-year Estimates (Table DP03)",
        updated: "2024",
        icon: BriefcaseIcon,
        
        variables: [
          {
            name: "Year",
            description: "",
            key: true,
          },
          {
            name: "Annual Earnings for Male Full-Time Workers",
            description: "Annual earnings for male full-time workers",
            datatype: "Currency",
            key: true,
          },
          {
            name: "Annual Earnings for Female Full-Time Workers",
            description: "Annual earnings for female full-time workers",
            datatype: "Currency",
            key: true,
          },
          {
            name: "Annual Earnings All Workers",
            description: "Annual earnings for all workers (Part-time and full-time)",
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
    datasets: [
      {
        name: "Selected Housing Characteristics",
        summary:
          "Housing value, supply, construction, and age statistics from Census ACS 5-year estimates.",
        source: "U.S. Census Bureau ACS 5-year Estimates (Table DP04)",
        updated: "2024",
        icon: HouseIcon,
        
        variables: [
          {
            name: "Median Home Value",
            description: "Median home value reported by ACS.",
            datatype: "Currency",
            key: true,
          },
          {
            name: "Rental Vacancy Rate",
            description: "",
            datatype: "Percentage",
            key: true,
          },
          {
            name: "Owned Vacancy Rate",
            description: "",
            datatype: "Percentage",
            key: true,
          },
          {
            name: "Total Housing Units",
            description:
              "Average annual income per person.",
            key: true,
          },
        ],
      },
      {
        name: "Median Home Value",
        summary: "Annual median home value estimate",
        source: "U.S. Census Bureau ACS 5-year Estimates (Table DP04)",
        updated: "2024",
        icon: HouseIcon,
        
        variables: [
          {
            name: "Year",
            description: "",
            key: true,
          },
          {
            name: "Median Home Value",
            description: "",
            key: true,
          },
        ],
      },
      {
        name: "Vacancy Rates",
        summary: "Annual owned and rented unit vacancy rates",
        source: "U.S. Census Bureau ACS 5-year Estimates (Table DP04)",
        updated: "2024",
        icon: HouseIcon,
        
        variables: [
          {
            name: "Year",
            description: "",
            key: true,
          },
          {
            name: "Owned Vacancy Rate",
            description: "",
            key: true,
          },
          {
            name: "Rented Vacancy Rate",
            description: "",
            key: true,
          },
        ],
      },
      {
        name: "Total Housing Units",
        summary: "Annual total housing unit estimates",
        source: "U.S. Census Bureau ACS 5-year Estimates (Table DP04)",
        updated: "2024",
        icon: HouseIcon,
        
        variables: [
          {
            name: "Year",
            description: "",
            key: true,
          },
          {
            name: "Total Housing Units",
            description: "",
            key: true,
          },
        ],
      },
    ],
  },

  {
    name: "Education",
    summary: "Educational attainment and enrollment characteristics.",
    icon: GraduationCapIcon,
    datasets: [
      {
        name: "Educational Attainment",
        summary:
          "Educational attainment statistics by degree from Census ACS 5-year estimates.",
        source: "U.S. Census Bureau, American Community Survey 5-Year Estimates (Table B15003)",
        updated: "2024",
        icon: HouseIcon,
        
        variables: [
          {
            name: "No High School Diploma",
            description: "",
            key: true,
          },
          {
            name: "High School",
            description: "",
            key: true,
          },
          {
            name: "Associate's Degree",
            description: "",
            key: true,
          },
          {
            name: "Bachelor's Degree",
            description: "",
            key: true,
          },
          {
            name: "Postgraduate Degree",
            description: "",
            key: true,
          },

        ],
      },
    ],
  },

  {
    name: "Environment",
    summary: "Wastewater and flood hazard datasets.",
    icon: DropIcon,
    datasets: [
      {
        name: "Wastewater Treatment Facilities",
        summary:
          "Statewide facilities with approved wastewater treatment permits.",
        source: "Vermont Agency of Natural Resources (ANR) NPDES permit database.",
        updated: "2024",
        icon: DropIcon,
        
        variables: [
          {
            name: "Facility ID",
            description: "ANR internal facility identifier",
            key: true,
          },
          {
            name: "Facility Name",
            description: "Name of the treatment facility",
            key: true,
          },
          {
            name: "Program Category",
            description: "Type of discharge permit",
            key: true,
          },
          {
            name: "Permit ID",
            description: "ANR permit record ID",
            key: true,
          },
          {
            name: "Hydraulic Capacity",
            description: "Design flow capacity in million gallons per day",
            key: true,
          },
          {
            name: "Septage Recieved",
            description: "Whether the facility accepts septage (Y/N)",
            key: true,
          },
          {
            name: "RPC",
            description: "Regional Planning Commission",
            key: true,
          },

        ],
      },
      {
        name: "Wastewater Service Areas",
        summary: "The geographic extent of each municipal sewer or stormwater collection system.",
        source: "UVM VERSO ORCA Wastewater Infrastructure Mapping Pod.",
        updated: "2024",
        icon: DropIcon,
        
        variables: [
          {
            name: "System Name",
            description: "Name of the collection system",
            key: true,
          },
          {
            name: "Treatment Facility",
            description: "ANR permit ID or name of the receiving treatment facility",
            key: true,
          },
          {
            name: "RPC",
            description: "Regional Planning Commission",
            key: true,
          },

        ],
      },
      {
        name: "Stormwater Management Areas",
        summary: "Stormwater management areas: wet ponds, dry detention basins, bioretention areas, infiltration basins, and similar green/grey infrastructure.",
        source: "Vermont Agency of Natural Resources (ANR) DEC dataset.",
        updated: "2024",
        icon: DropIcon,
        
        variables: [
          {
            name: "Type",
            description: "Type of stormwater management area (extended detention basin, wet pond, etc.)",
            key: true,
          },
        ],
      },
      {
        name: "Sewage Disposal Soil Ratings",
        summary: "Depicts onsite sewage disposal suitability of Vermont soils.",
        source: "Vermont Agency of Natural Resources (ANR) DEC dataset.",
        updated: "2024",
        icon: DropIcon,
        
        variables: [
          {
            name: "Suitability Rating",
            description: "Soil rating for sewage disposal infrastructure",
            key: true,
          },
          {
            name: "RPC",
            description: "Regional Planning Commission",
            key: true,
          },
        ],
      },
      {
        name: "Flood Hazard Areas",
        summary: "Shows FEMA-designated flood hazard zones in Vermont, including areas subject to varying levels of flood risk.",
        source: "Vermont Center for Geographic Information (VCGI), derived from FEMA National Flood Hazard Layer (NFHL).",
        updated: "2024",
        icon: DropIcon,
        
        variables: [],
      },
    ],
  },
  {
    name: "Demographics & Population",
    summary:
      "Demographic characteristics, population estimates, sex, and race information.",
    icon: UsersThreeIcon,
    datasets: [
      {
        name: "Selected Demographic Characteristics",
        summary: "Population, age, sex, and race statistics from Census ACS 5-year estimates.",
        source: "U.S. Census Bureau ACS 5-year Estimates (Table DP05)",
        updated: "2024",
        icon: UsersThreeIcon,
        
        variables: [
          {
            name: "Median Age",
            description: "Median age reported by ACS.",
            key: true,
          },
          {
            name: "Sex Ratio",
            description: "Unemployment rate among the civilian labor force.",
            key: true,
          },
          {
            name: "Race Distribution",
            description:
              "Employment counts by NAICS industry sector.",
            key: true,
          },
          {
            name: "Age Distribution",
            description:
              "Average annual income per person.",
            key: true,
          },
        ],
      },
      {
        name: "Historic Population Estimates",
        summary: "Annual town-level population estimates from 1791-2020.",
        source: "Vermont Historical Society; Vermont Center for Geographic Information (VCGI)",
        updated: "2024",
        icon: UsersThreeIcon,
        
        variables: [
          {
            name: "Year",
            description: "",
            key: true,
          },
          {
            name: "Population",
            description: "",
            key: true,
          },
        ],
      },
      {
        name: "Age Dependency Ratio",
        summary: "Annual age dependency ratio estimates, measuring dependent burden.",
        source: "U.S. Census Bureau ACS 5-year Estimates (Table DP05)",
        updated: "2024",
        icon: UsersThreeIcon,
        
        variables: [
          {
            name: "Year",
            description: "",
            key: true,
          },
          {
            name: "Age Dependency Ratio",
            description: "",
            key: true,
          },
        ],
      },
      {
        name: "Median Age",
        summary: "Annual median age estimate",
        source: "U.S. Census Bureau ACS 5-year Estimates (Table DP05)",
        updated: "2024",
        icon: UsersThreeIcon,
        
        variables: [
          {
            name: "Year",
            description: "",
            key: true,
          },
          {
            name: "Median Age",
            description: "",
            key: true,
          },
        ],
      },
    ],
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
        cursor: "pointer",
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
          <Title order={2 }style={{
            color: COLOR.spruceDeep,
            fontFamily: FONT_BODY
          }}>
            {`${category?.name} Datasets`}
          </Title>
          <SimpleGrid
          cols={{
            base: 1,
            sm: 2,
            lg: 4,
          }}>
          {category.datasets.length === 0 ? (
            <Text c="dimmed"> Dataset details coming soon.</Text>) : (
            category.datasets.map((dataset) => (
              <DatasetCard key={dataset.name} dataset={dataset}/>
            ))
          )}
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

  const [selectedCategory, setSelectedCategory] =
    useState<Category | null>(null);

  const [selectedDataset, setSelectedDataset] =
    useState<Dataset | null>(null);

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