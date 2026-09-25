import React, { useEffect, useState } from 'react';
import {
  Button,
  Divider,
  Paper,
  Modal,
  MultiSelect,
  RangeSlider,
  Select,
  Stack,
  Text,
  Title,
  Box,
  Alert,
  Group,
  SimpleGrid,
  type ComboboxData,
  type ComboboxItem,
  type ComboboxParsedItem,
  type OptionsFilter,
} from '@mantine/core';
import {
  useProfile,
  INTEREST_OPTIONS,
  YEAR_MIN_OVERALL,
  YEAR_MAX_OVERALL,
  Location,
} from './profileStore';
import county_town_names from '@/data/county_town_names.json';
import {
  IconCalendarStats,
  IconCheck,
  IconMapPin,
  IconTags,
} from '@tabler/icons-react';
import { UserCircleIcon } from '@phosphor-icons/react';
import { COLORS, FONTS } from '@/app/theme';

type CountyKey = keyof typeof county_town_names;

const getName = (
  type: string,
  county?: string | null,
  town?: string | null,
) => {
  if (type === 'national') return 'United States';
  if (type === 'state') return 'Vermont';
  if (type === 'county' && county) return `${county} County, Vermont`;
  if (type === 'town' && county && town)
    return `${town}, ${county} County, Vermont`;
  return 'Unknown';
};

interface ProfileLocationSelectProps {
  title: string;
  location: Location;
  setLocation: (loc: Location) => void;
  showNational?: boolean;
  /** Places listed first, before the user types. */
  suggestions?: Location[];
}

function ProfileButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      variant="outline"
      color="blue"
      radius="xl"
      size="md"
      leftSection={<UserCircleIcon size={26} weight="light" />}
      style={{ flexShrink: 0, fontWeight: 500 }}
    >
      My Profile
    </Button>
  );
}

// Every place a profile can pick, as one searchable list: the state (and the
// nation, for comparisons), the 14 counties, and every town labeled with its
// county. Option values encode the whole location, e.g. "town:Addison:
// Middlebury town", so picking one needs no follow-up choices.

const SUGGESTED_PREFIX = 'suggested:';

function locationKey(l: Location): string {
  if (l.type === 'national' || l.type === 'state') return l.type;
  if (l.type === 'county') return `county:${l.county}`;
  if (l.type === 'town') return `town:${l.county}:${l.town ?? ''}`;
  return l.type;
}

function makeLocation(
  type: Location['type'],
  county: string | null = null,
  town: string | null = null,
): Location {
  return {
    type,
    state: type === 'state',
    county,
    town,
    name: getName(type, county, town),
  };
}

const counties = Object.keys(county_town_names) as CountyKey[];

// Each option's location, and for towns the county shown beside the name
// and matched by the search.
const PLACES = new Map<string, { location: Location; county?: string }>([
  ['national', { location: makeLocation('national') }],
  ['state', { location: makeLocation('state') }],
  ...counties.map(
    (c) => [`county:${c}`, { location: makeLocation('county', c) }] as const,
  ),
  ...counties.flatMap((c) =>
    county_town_names[c].map(
      (t) =>
        [
          `town:${c}:${t}`,
          { location: makeLocation('town', c, t), county: `${c} County` },
        ] as const,
    ),
  ),
]);

function placeLabel(l: Location): string {
  if (l.type === 'national') return 'United States';
  if (l.type === 'state') return 'Vermont';
  if (l.type === 'county') return `${l.county} County`;
  return l.town ?? l.name;
}

function placeGroups(
  showNational: boolean,
  suggestions: Location[],
): ComboboxData {
  const item = (l: Location, prefix = '') => ({
    value: prefix + locationKey(l),
    label: placeLabel(l),
  });
  const towns = counties
    .flatMap((c) => county_town_names[c].map((t) => makeLocation('town', c, t)))
    .sort((a, b) => (a.town ?? '').localeCompare(b.town ?? ''));
  return [
    ...(suggestions.length
      ? [
          {
            group: 'Suggested',
            items: suggestions.map((l) => item(l, SUGGESTED_PREFIX)),
          },
        ]
      : []),
    {
      group: 'State',
      items: [
        ...(showNational ? [item(makeLocation('national'))] : []),
        item(makeLocation('state')),
      ],
    },
    {
      group: 'Counties',
      items: counties.map((c) => item(makeLocation('county', c))),
    },
    { group: 'Towns', items: towns.map((l) => item(l)) },
  ];
}

// Matches a place's name or, for a town, its county ("addison" lists
// Addison County and all its towns). Suggestions only show before typing,
// since they repeat places listed below.
const filterPlaces: OptionsFilter = ({ options, search }) => {
  const query = search.toLowerCase().trim();
  if (!query) return options;
  const matches = (item: ComboboxItem) => {
    const county = PLACES.get(item.value)?.county ?? '';
    return (
      item.label.toLowerCase().includes(query) ||
      county.toLowerCase().includes(query)
    );
  };
  return options.flatMap<ComboboxParsedItem>((option) => {
    if (!('group' in option)) return matches(option) ? [option] : [];
    if (option.group === 'Suggested') return [];
    const items = option.items.filter(matches);
    return items.length ? [{ ...option, items }] : [];
  });
};

// Places worth offering first as a comparison: the county a town sits in,
// then Vermont (or the nation, when the location is Vermont itself).
export function comparisonSuggestions(l: Location): Location[] {
  if (l.type === 'town' && l.county) {
    return [makeLocation('county', l.county), makeLocation('state')];
  }
  if (l.type === 'county') return [makeLocation('state')];
  if (l.type === 'state') return [makeLocation('national')];
  return [];
}

const ProfileLocationSelect: React.FC<ProfileLocationSelectProps> = ({
  title,
  location,
  setLocation,
  showNational = false,
  suggestions = [],
}) => {
  const key = locationKey(location);

  return (
    <Stack gap="xs">
      <Title order={3}>{title}</Title>

      <Select
        aria-label={title}
        placeholder="Search towns and counties"
        radius="md"
        searchable
        // Select the current place on focus, so typing replaces it.
        onFocus={(e) => e.currentTarget.select()}
        allowDeselect={false}
        maxDropdownHeight={320}
        nothingFoundMessage="No matching places"
        value={PLACES.has(key) ? key : null}
        onChange={(value) => {
          const place = value
            ? PLACES.get(value.replace(SUGGESTED_PREFIX, ''))
            : undefined;
          if (place) setLocation(place.location);
        }}
        data={placeGroups(showNational, suggestions)}
        filter={filterPlaces}
        renderOption={({ option, checked }) => {
          const county = PLACES.get(
            option.value.replace(SUGGESTED_PREFIX, ''),
          )?.county;
          return (
            <Group justify="space-between" wrap="nowrap" w="100%" gap="sm">
              <Group gap={6} wrap="nowrap">
                {/* Mantine's check mark, which a custom option drops. */}
                <IconCheck
                  size={14}
                  style={{ visibility: checked ? 'visible' : 'hidden' }}
                />
                <Text size="sm">{option.label}</Text>
              </Group>
              {county && (
                <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                  {county}
                </Text>
              )}
            </Group>
          );
        }}
      />
    </Stack>
  );
};

const START_YEAR = 2009;
const YEAR_STEP = 3;
const LATEST_YEAR = new Date().getFullYear() - 2;

const YEAR_MARKS = Array.from(
  { length: Math.floor((LATEST_YEAR - START_YEAR) / YEAR_STEP) + 1 },
  (_, i) => {
    const year = START_YEAR + i * YEAR_STEP;
    return {
      value: year,
      label: String(year),
    };
  },
);

export const ProfileModal: React.FC = () => {
  const {
    myLocation,
    setLocation,
    comparison,
    setComparison,
    interests,
    setInterests,
    yearMin,
    yearMax,
    setYearRange,
    profileSet,
    setProfileSet,
    profileModalOpen,
    openProfileModal,
    closeProfileModal,
  } = useProfile();

  const opened = profileModalOpen;

  // Profile is not automatically opened each reload
  const [hydrated, setHydrated] = useState(
    () => typeof window !== 'undefined' && useProfile.persist.hasHydrated(),
  );

  useEffect(() => {
    return useProfile.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  // Open automatically once hydrated if the user hasn't saved a profile yet.
  useEffect(() => {
    if (hydrated && !profileSet) openProfileModal();
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const [tempMyLocation, setTempMyLocation] = useState<Location>(myLocation);
  const [tempComparison, setTempComparison] = useState<Location>(comparison);
  const [tempInterests, setTempInterests] = useState<string[]>(interests);
  const [tempYearRange, setTempYearRange] = useState<[number, number]>([
    yearMin,
    yearMax,
  ]);

  const handleOpen = () => {
    // Sync temp state from store each time the modal opens
    setTempMyLocation(myLocation);
    setTempComparison(comparison);
    setTempInterests(interests);
    setTempYearRange([yearMin, yearMax]);
    openProfileModal();
  };

  const handleSave = () => {
    setLocation(tempMyLocation);
    setComparison(tempComparison);
    setInterests(tempInterests);
    setYearRange(tempYearRange[0], tempYearRange[1]);
    setProfileSet(true);
    closeProfileModal();
  };

  return (
    <>
      <ProfileButton onClick={handleOpen} />
      <Modal
        opened={opened}
        onClose={closeProfileModal}
        title="Profile"
        radius="xl"
        centered
        size={900}
        shadow="xl"
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 4,
        }}
        styles={{
          content: {
            borderRadius: 20,
          },
          header: {
            paddingBottom: 20,
          },
          title: {
            fontFamily: FONTS.display,
            fontSize: '2rem',
            color: COLORS.ink,
            fontWeight: 500,
          },
          body: {
            fontFamily: FONTS.body,
            maxHeight: 600,
          },
        }}
      >
        <Stack gap="xl">
          {!profileSet && (
            <Alert
              variant="light"
              color="blue"
              radius="md"
              styles={{
                root: {
                  fontFamily: FONTS.body,
                },
              }}
            >
              Select a profile before beginning. Only your location is required;
              other fields are optional.
            </Alert>
          )}

          {/* Locations */}
          <Box
            p="lg"
            style={{
              borderRadius: 18,
            }}
          >
            <Group gap={8} mb={4}>
              <IconMapPin size={16} color={COLORS.spruce} />

              <Text
                tt="uppercase"
                fw={700}
                fz={11}
                c={COLORS.slate}
                style={{
                  letterSpacing: 1.2,
                  fontFamily: FONTS.body,
                }}
              >
                Locations
              </Text>
            </Group>

            <Text size="sm" c={COLORS.slate}>
              Choose where you live and what to compare against.
            </Text>

            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <ProfileLocationSelect
                title="My Location"
                location={tempMyLocation}
                setLocation={setTempMyLocation}
              />

              <ProfileLocationSelect
                title="Comparison"
                location={tempComparison}
                setLocation={setTempComparison}
                showNational
                suggestions={comparisonSuggestions(tempMyLocation)}
              />
            </SimpleGrid>
          </Box>

          {/* Interests + Years */}
          <Box
            p="lg"
            style={{
              borderRadius: 18,
            }}
          >
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
              <Box>
                <Group gap={8} mb={4}>
                  <IconTags size={17} color={COLORS.spruce} />

                  <Text
                    fw={600}
                    style={{
                      fontFamily: FONTS.display,
                      color: COLORS.spruce,
                      fontSize: '1.05rem',
                    }}
                  >
                    Areas of Interest
                  </Text>
                </Group>

                <Text
                  size="sm"
                  c="dimmed"
                  mb="lg"
                  style={{ fontFamily: FONTS.body }}
                >
                  Highlight charts related to the topics you care about most.
                </Text>

                <MultiSelect
                  data={INTEREST_OPTIONS}
                  value={tempInterests}
                  onChange={setTempInterests}
                  placeholder="Any topic"
                  clearable
                  radius="md"
                />
              </Box>

              <Box>
                <Group gap={8} mb={4}>
                  <IconCalendarStats size={17} color={COLORS.spruce} />

                  <Text
                    fw={600}
                    style={{
                      fontFamily: FONTS.display,
                      color: COLORS.spruce,
                      fontSize: '1.05rem',
                    }}
                  >
                    Years of Interest
                  </Text>
                </Group>

                <Text
                  size="sm"
                  c="dimmed"
                  mb="xl"
                  style={{ fontFamily: FONTS.body }}
                >
                  Display data from{' '}
                  <Text span fw={700} c={COLORS.spruce}>
                    {tempYearRange[0]}–{tempYearRange[1]}
                  </Text>
                  .
                </Text>

                <RangeSlider
                  min={YEAR_MIN_OVERALL}
                  max={YEAR_MAX_OVERALL}
                  step={1}
                  minRange={5}
                  value={tempYearRange}
                  onChange={setTempYearRange}
                  marks={YEAR_MARKS}
                  label={(v) => String(v)}
                  color={COLORS.spruce}
                />
              </Box>
            </SimpleGrid>
          </Box>

          <Group justify="space-between">
            <Text size="xs" c="dimmed" style={{ fontFamily: FONTS.body }}>
              Your profile personalizes charts and comparisons throughout the
              platform.
            </Text>

            <Group>
              <Button
                variant="subtle"
                color="gray"
                onClick={closeProfileModal}
                style={{
                  fontFamily: FONTS.body,
                }}
              >
                Cancel
              </Button>

              <Button
                radius="xl"
                size="md"
                color={COLORS.spruce}
                onClick={handleSave}
                style={{
                  fontFamily: FONTS.body,
                  fontWeight: 600,
                  paddingInline: 26,
                }}
              >
                Save Profile
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};
