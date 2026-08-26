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
} from '@mantine/core';
import {
  useProfile,
  INTEREST_OPTIONS,
  YEAR_MIN_OVERALL,
  YEAR_MAX_OVERALL,
  Location,
} from './profileStore';
import * as motion from 'motion/react-client';
import county_town_names from '@/data/county_town_names.json';
import { IconMapPin, IconTags, IconCalendarStats } from '@tabler/icons-react';
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
}

function ProfileButton({
  onClick,
  opened,
}: {
  onClick: () => void;
  opened: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      initial="rest"
      whileHover="hover"
      whileTap={{ scale: 0.96 }}
      animate={opened ? 'hover' : 'rest'}
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 20px',
        borderRadius: 999,
        border: '1.5px solid var(--mantine-color-blue-6)',
        background: 'transparent',
        cursor: 'pointer',
        fontWeight: 500,
        fontSize: 16,
        maxHeight: 45,
        maxWidth: 170,
      }}
    >
      <motion.span
        variants={{
          rest: { scaleX: 0 },
          hover: { scaleX: 1 },
        }}
        transition={{ duration: 0.4, ease: [0.65, 0, 0.35, 1] }}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--mantine-color-blue-6)',
          transformOrigin: 'left',
          zIndex: 0,
        }}
      />
      <motion.span
        variants={{
          rest: { color: 'var(--mantine-color-blue-6)' },
          hover: { color: '#fff' },
        }}
        transition={{ duration: 0.25 }}
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <UserCircleIcon size={30} weight="light" />
        My Profile
      </motion.span>
    </motion.button>
  );
}

const ProfileLocationSelect: React.FC<ProfileLocationSelectProps> = ({
  title,
  location,
  setLocation,
  showNational = false,
}) => {
  const counties = Object.keys(county_town_names) as CountyKey[];

  return (
    <Stack gap="xs">
      <Title order={3}>{title}</Title>

      <Select
        label="Area type"
        radius="md"
        value={location.type}
        onChange={(value) => {
          if (!value) return;
          const newType = value as Location['type'];
          setLocation({
            type: newType,
            state: newType === 'state',
            county: newType === 'town' ? location.county : null,
            town: null,
            name: getName(newType, newType === 'town' ? location.county : null),
          });
        }}
        data={[
          ...(showNational
            ? [{ value: 'national', label: 'All of The United States' }]
            : []),
          { value: 'state', label: 'All of Vermont' },
          { value: 'county', label: 'County' },
          { value: 'town', label: 'Town' },
        ]}
      />

      {(location.type === 'county' || location.type === 'town') && (
        <Select
          label="Pick a county"
          value={location.county || ''}
          radius="md"
          onChange={(value) =>
            value &&
            setLocation({
              ...location,
              county: value,
              town: null,
              name: getName(location.type, value, null),
            })
          }
          data={counties.map((c) => ({ value: c, label: c }))}
        />
      )}

      {location.type === 'town' && location.county && (
        <Select
          label="Pick a town"
          value={location.town || ''}
          radius="md"
          onChange={(value) =>
            value &&
            setLocation({
              ...location,
              town: value,
              name: getName(location.type, location.county, value),
            })
          }
          data={county_town_names[location.county as CountyKey].map((t) => ({
            value: t,
            label: t,
          }))}
        />
      )}
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

  // Open automatically after mount if the user hasn't saved a profile yet.
  useEffect(() => {
    if (!profileSet) openProfileModal();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      <ProfileButton onClick={handleOpen} opened={opened} />
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
