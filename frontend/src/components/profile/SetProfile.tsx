import React, { useEffect, useState, useSyncExternalStore } from 'react';
import {
  Button,
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
  Highlight,
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
  /** Places listed first under their own heading, before the user types. */
  suggestions?: { heading: string; places: Location[] };
}

// The header's way into the profile: it names the places being compared, as
// a hint that this is where they change. Two lines when there's a
// comparison; "My Profile" until the saved profile has loaded (so the static
// page and the first client render match).
function ProfileButton({
  onClick,
  lines,
}: {
  onClick: () => void;
  lines: string[];
}) {
  return (
    <Button
      onClick={onClick}
      variant="outline"
      color="blue"
      radius="xl"
      leftSection={<UserCircleIcon size={22} weight="light" />}
      aria-label={`Edit profile: ${lines.join(' ')}`}
      styles={{
        root: {
          flexShrink: 0,
          height: 'auto',
          minHeight: 42,
          maxWidth: 220,
          paddingBlock: 4,
        },
        label: {
          flexDirection: 'column',
          alignItems: 'flex-start',
          lineHeight: 1.25,
          overflow: 'hidden',
        },
      }}
    >
      {lines.map((line, i) => (
        <Text
          key={i}
          span
          size={i === 0 ? 'sm' : 'xs'}
          fw={i === 0 ? 600 : 400}
          truncate
          maw="100%"
        >
          {line}
        </Text>
      ))}
    </Button>
  );
}

function profileButtonLines(
  hydrated: boolean,
  profileSet: boolean,
  myLocation: Location,
  comparison: Location,
): string[] {
  if (!hydrated) return ['My Profile'];
  if (!profileSet) return ['Set your profile'];
  const place = placeLabel(myLocation);
  const other = placeLabel(comparison);
  return other && other !== place ? [place, other] : [place];
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
  suggestions?: { heading: string; places: Location[] },
): ComboboxData {
  const item = (l: Location, prefix = '') => ({
    value: prefix + locationKey(l),
    label: placeLabel(l),
  });
  const towns = counties
    .flatMap((c) => county_town_names[c].map((t) => makeLocation('town', c, t)))
    .sort((a, b) => (a.town ?? '').localeCompare(b.town ?? ''));
  return [
    ...(suggestions?.places.length
      ? [
          {
            group: suggestions.heading,
            items: suggestions.places.map((l) => item(l, SUGGESTED_PREFIX)),
          },
        ]
      : []),
    {
      group: showNational ? 'State & nation' : 'State',
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
// Addison County and all its towns). Within each group, names starting with
// the search come first, then names containing it, then towns matched only
// by county, so "essex" puts Essex town above Essex County's towns.
// Suggestions only show before typing, since they repeat places below.
const filterPlaces: OptionsFilter = ({ options, search }) => {
  const query = search.toLowerCase().trim();
  if (!query) return options;
  // 0-2 for a match (lower is better), or null for none.
  const rank = (item: ComboboxItem) => {
    const label = item.label.toLowerCase();
    if (label.startsWith(query)) return 0;
    if (label.includes(query)) return 1;
    const county = PLACES.get(item.value)?.county ?? '';
    return county.toLowerCase().includes(query) ? 2 : null;
  };
  const ranked = (items: ComboboxItem[]) =>
    items
      .map((item) => ({ item, rank: rank(item) }))
      .filter((r): r is { item: ComboboxItem; rank: number } => r.rank != null)
      .sort((a, b) => a.rank - b.rank) // stable: alphabetical within a rank
      .map((r) => r.item);
  return options.flatMap<ComboboxParsedItem>((option) => {
    if (!('group' in option)) return rank(option) != null ? [option] : [];
    if (option.items.some((i) => i.value.startsWith(SUGGESTED_PREFIX))) {
      return [];
    }
    const items = ranked(option.items);
    return items.length ? [{ ...option, items }] : [];
  });
};

// The places containing a location, offered first as comparisons: a town's
// county, then Vermont (or the nation, when the location is Vermont itself).
// They also appear in their own groups; the heading says why they're here.
export function comparisonSuggestions(l: Location): {
  heading: string;
  places: Location[];
} {
  const heading = `Areas that include ${placeLabel(l)}`;
  if (l.type === 'town' && l.county) {
    return {
      heading,
      places: [makeLocation('county', l.county), makeLocation('state')],
    };
  }
  if (l.type === 'county') return { heading, places: [makeLocation('state')] };
  if (l.type === 'state')
    return { heading, places: [makeLocation('national')] };
  return { heading, places: [] };
}

// Search matches in bold, rather than Mantine's default yellow mark.
const MATCH_STYLE = {
  backgroundColor: 'transparent',
  color: 'inherit',
  fontWeight: 700,
  padding: 0,
};

const ProfileLocationSelect: React.FC<ProfileLocationSelectProps> = ({
  title,
  location,
  setLocation,
  showNational = false,
  suggestions,
}) => {
  const key = locationKey(location);
  const selected = PLACES.has(key) ? placeLabel(location) : '';
  const [search, setSearch] = useState(selected);
  // Bold what the user typed; nothing while the box still shows the pick.
  const query = search.trim() === selected ? '' : search.trim();

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
        searchValue={search}
        onSearchChange={setSearch}
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
                <Highlight
                  size="sm"
                  highlight={query}
                  highlightStyles={MATCH_STYLE}
                >
                  {option.label}
                </Highlight>
              </Group>
              {county && (
                <Highlight
                  size="xs"
                  c="dimmed"
                  highlight={query}
                  highlightStyles={MATCH_STYLE}
                  style={{ flexShrink: 0 }}
                >
                  {county}
                </Highlight>
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

  // Whether the saved profile has loaded. False on the server and during
  // React's first client render, when the store still reports its defaults
  // (profileSet false); reading persist.hasHydrated() directly said true
  // there, which opened the dialog on every load and made the header text
  // differ from the server's.
  const hydrated = useSyncExternalStore(
    (onChange) => useProfile.persist.onFinishHydration(onChange),
    () => useProfile.persist.hasHydrated(),
    () => false,
  );

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
      <ProfileButton
        onClick={handleOpen}
        lines={profileButtonLines(hydrated, profileSet, myLocation, comparison)}
      />
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
