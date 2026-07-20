'use client';

import {
  Box,
  Container,
  Grid,
  Text,
  Title,
  Card,
  Stack,
  Group,
  Select,
  Divider,
  Table,
  Button,
} from '@mantine/core';
import { useState } from 'react';

const COLOR = {
  spruce: '#1B3A2F',
  spruceDeep: '#122820',
  slate: '#40525A',
  birch: '#F6F5EF',
  birchDim: '#EEEBE0',
  ink: '#1B211D',
  amber: '#dd9a2f',
  amberSoft: '#E7B563',
  line: 'rgba(27, 58, 47, 0.14)',
};

const FONT_DISPLAY = "'Fraunces', 'Iowan Old Style', serif";
const FONT_BODY = "'General Sans', 'Inter', sans-serif";
const FONT_MONO = "'IBM Plex Mono', ui-monospace, monospace";


const DATA_SOURCES = {
  Housing: [
    {
      name: 'Housing Characteristics',
      source:
        'U.S. Census Bureau, American Community Survey 5-Year Estimates',
      description:
        'Housing occupancy, tenure, and value estimates for Vermont communities.',
      updated: '2023',
      variables: [
        {
          category: 'Housing Units',
          name: 'B25002',
          meaning: 'Housing occupancy status',
        },
        {
          category: 'Ownership',
          name: 'B25003',
          meaning:
            'Owner-occupied and renter-occupied housing units',
        },
        {
          category: 'Value',
          name: 'B25077',
          meaning:
            'Median value of owner-occupied housing units',
        },
      ],
    },
  ],

  'Land Use': [
    {
      name: 'Municipal Zoning',
      source: 'Municipal Zoning Records',
      description:
        'Normalized zoning districts and regulations collected from Vermont municipalities.',
      updated: '2024',
      variables: [
        {
          category: 'District',
          name: 'district_type',
          meaning:
            'Generalized zoning district classification',
        },
        {
          category: 'Rules',
          name: 'minimum_lot_size',
          meaning:
            'Minimum allowed parcel size',
        },
      ],
    },
  ],

  Economy: [
    {
      name: 'Employment by Industry',
      source:
        'U.S. Bureau of Labor Statistics, Quarterly Census of Employment and Wages',
      description:
        'Employment and wage estimates by industry sector.',
      updated: '2023-Q4',
      variables: [
        {
          category: 'Employment',
          name: 'employment',
          meaning:
            'Average covered employment',
        },
        {
          category: 'Industry',
          name: 'naics_sector',
          meaning:
            'NAICS industry classification',
        },
      ],
    },
  ],
};


export default function DataSourcesPage() {

  const [subject, setSubject] =
    useState('Housing');

  const [selectedSource, setSelectedSource] =
    useState(0);


  const sources =
    DATA_SOURCES[
      subject as keyof typeof DATA_SOURCES
    ];

  const activeSource =
    sources[selectedSource];


  return (

    <Box>

      {/* Hero */}
      <Box
        style={{
          position: 'relative',
          width: '100vw',
          left: '50%',
          marginLeft: '-50vw',
          background:
            `linear-gradient(160deg, ${COLOR.spruceDeep} 0%, ${COLOR.spruce} 100%)`,
          paddingTop: 70,
          paddingBottom: 50,
        }}
      >

        <Container size="xl">

          <Text
            style={{
              fontFamily: FONT_MONO,
              fontSize: 12,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: COLOR.amberSoft,
            }}
          >
            Resources
          </Text>


          <Title
            order={1}
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 600,
              fontSize:
                'clamp(2.3rem, 5vw, 3.7rem)',
              color: COLOR.birch,
              marginTop: 14,
            }}
          >
            Data Sources
          </Title>


          <Text
            size="lg"
            mt={12}
            maw={650}
            style={{
              color:
                'rgba(246,245,239,0.7)',
              fontFamily: FONT_BODY,
            }}
          >
            Explore the datasets behind the Vermont
            Data Collaborative. Learn where data
            originates and what each variable means.
          </Text>

        </Container>

      </Box>


      <Container size="xl" py={50}>

        <Stack gap="xl">


          <Select
            label="Subject Area"
            value={subject}
            onChange={(value) =>
              setSubject(value || 'Housing')
            }
            data={
              Object.keys(DATA_SOURCES)
            }
          />


          <Grid>

            {sources.map((source,index)=>(

              <Grid.Col
                key={source.name}
                span={{
                  base:12,
                  md:4
                }}
              >

                <Card
                  withBorder
                  radius="lg"
                  p="lg"
                  onClick={() =>
                    setSelectedSource(index)
                  }
                  style={{
                    cursor:'pointer',
                    borderColor:
                      selectedSource === index
                        ? COLOR.amber
                        : COLOR.line,
                  }}
                >

                  <Stack gap="sm">

                    <Title
                      order={3}
                      style={{
                        fontFamily:
                          FONT_DISPLAY,
                        fontWeight:600,
                      }}
                    >
                      {source.name}
                    </Title>


                    <Text size="sm">
                      {source.source}
                    </Text>


                    <Text
                      size="sm"
                      c="dimmed"
                    >
                      {source.description}
                    </Text>

                  </Stack>

                </Card>

              </Grid.Col>

            ))}

          </Grid>


          <Divider />


          <Box>

            <Group justify="space-between"
              mb="md">

              <Box>

                <Text
                  style={{
                    fontFamily:FONT_MONO,
                    fontSize:11,
                    letterSpacing:'0.12em',
                    textTransform:'uppercase',
                    color:COLOR.slate,
                  }}
                >
                  Variables
                </Text>


                <Title
                  order={2}
                  style={{
                    fontFamily:
                      FONT_DISPLAY,
                  }}
                >
                  {activeSource.name}
                </Title>

              </Box>


              <Button
                variant="light"
                color="green"
              >
                Compare Variables
              </Button>

            </Group>


            <Card
              withBorder
              radius="lg"
              p={0}
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

                  {activeSource.variables.map(
                    variable => (

                    <Table.Tr
                      key={variable.name}
                    >

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

          </Box>


        </Stack>

      </Container>

    </Box>

  );
}