"use client";

import {
  Card,
  Container,
  Divider,
  Group,
  Select,
  Stack,
  Table,
  Text,
  Title,
  Badge,
  Button,
} from "@mantine/core";
import { useState } from "react";

const FONT_DISPLAY = "Zilla Slab";

const DATA_SOURCES = {
  Housing: [
    {
      name: "Housing Characteristics",
      source:
        "U.S. Census Bureau, American Community Survey 5-Year Estimates",
      updated: "2023",
      description:
        "Housing occupancy, tenure, and value estimates for Vermont communities.",
      variables: [
        {
          category: "Housing Units",
          name: "B25002",
          meaning: "Housing occupancy status",
        },
        {
          category: "Ownership",
          name: "B25003",
          meaning: "Owner-occupied and renter-occupied housing units",
        },
        {
          category: "Value",
          name: "B25077",
          meaning: "Median value of owner-occupied housing units",
        },
      ],
    },
  ],

  "Land Use": [
    {
      name: "Municipal Zoning",
      source: "Municipal Zoning Records",
      updated: "2024",
      description:
        "Normalized zoning districts and regulations from Vermont municipalities.",
      variables: [
        {
          category: "District",
          name: "district_type",
          meaning: "Generalized zoning district classification",
        },
        {
          category: "Rules",
          name: "minimum_lot_size",
          meaning: "Minimum allowed parcel size",
        },
      ],
    },
  ],

  Economy: [
    {
      name: "Employment by Industry",
      source:
        "U.S. Bureau of Labor Statistics, Quarterly Census of Employment and Wages",
      updated: "2023-Q4",
      description:
        "Employment and wage estimates by industry sector.",
      variables: [
        {
          category: "Employment",
          name: "employment",
          meaning: "Average covered employment",
        },
        {
          category: "Industry",
          name: "naics_sector",
          meaning: "NAICS industry classification",
        },
      ],
    },
  ],
};

export default function DataSourcesPage() {
  const [subject, setSubject] = useState<string | null>("Housing");
  const [selectedSource, setSelectedSource] = useState(0);

  const sources = subject ? DATA_SOURCES[subject as keyof typeof DATA_SOURCES] : [];

  const activeSource = sources[selectedSource];

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">

        <Stack gap={4}>
          <Title
            order={1}
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: "clamp(2rem, 4vw, 3rem)",
            }}
          >
            Data Sources
          </Title>

          <Text size="lg" c="dimmed">
            Explore the datasets powering the Vermont Data Collaborative.
            Learn where the data comes from and what each variable represents.
          </Text>
        </Stack>


        <Divider />


        <Select
          label="Subject Area"
          placeholder="Choose a subject"
          value={subject}
          onChange={(value) => {
            setSubject(value);
            setSelectedSource(0);
          }}
          data={Object.keys(DATA_SOURCES)}
        />


        <Group align="stretch" wrap="wrap">
          {sources.map((source, index) => (
            <Card
              key={source.name}
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              style={{
                flex: "1 1 300px",
                cursor: "pointer",
              }}
              onClick={() => setSelectedSource(index)}
            >
              <Stack>
                <Title order={3} style={{ fontFamily: FONT_DISPLAY }}>
                  {source.name}
                </Title>

                <Text size="sm">
                  {source.source}
                </Text>

                <Badge>
                  Updated {source.updated}
                </Badge>

                <Text size="sm" c="dimmed">
                  {source.description}
                </Text>
              </Stack>
            </Card>
          ))}
        </Group>


        {activeSource && (
          <>
            <Divider />

            <Stack gap="md">

              <Group justify="space-between">
                <Title
                  order={2}
                  style={{
                    fontFamily: FONT_DISPLAY,
                  }}
                >
                  {activeSource.name} Variables
                </Title>

                <Button variant="light">
                  Compare Variables
                </Button>
              </Group>


              <Card
                withBorder
                radius="md"
                padding="0"
              >
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>
                        Category
                      </Table.Th>

                      <Table.Th>
                        Variable
                      </Table.Th>

                      <Table.Th>
                        Meaning
                      </Table.Th>
                    </Table.Tr>
                  </Table.Thead>

                  <Table.Tbody>
                    {activeSource.variables.map((variable) => (
                      <Table.Tr key={variable.name}>

                        <Table.Td>
                          {variable.category}
                        </Table.Td>

                        <Table.Td>
                          {variable.name}
                        </Table.Td>

                        <Table.Td>
                          {variable.meaning}
                        </Table.Td>

                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Card>

            </Stack>
          </>
        )}

      </Stack>
    </Container>
  );
}