import React, { useEffect, useState } from 'react';
import {
  Button,
  Divider,
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

const YEAR_MARKS = [2009, 2012, 2015, 2018, 2021, 2024].map((y) => ({
  value: y,
  label: String(y),
}));

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
        radius="lg"
        centered
        size={900}
        shadow="xl"
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
        styles={{
          title: { fontWeight: 700, fontSize: '1.15rem' },
          body: { overflowX: 'hidden', maxHeight: 450 },
        }}
      >
        <Stack gap="lg">
          {!profileSet && (
            <Alert variant="light" color="blue" radius="md">
              Select a profile before beginning. Only your location is required;
              other fields are optional.
            </Alert>
          )}

          {/* Locations */}
          <Box>
            <Group gap={6} mb={2}>
              <IconMapPin size={16} stroke={1.75} />
              <Text size="sm" fw={600}>
                Locations
              </Text>
            </Group>
            <Text size="xs" c="dimmed" mb="sm">
              Choose where you are and what you'd like to compare against.
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 2 }} spacing="md">
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

          <Divider />

          {/* Interests + Year range, side by side */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
            <Box>
              <Group gap={6} mb={2}>
                <IconTags size={16} stroke={1.75} />
                <Text size="sm" fw={600}>
                  Areas of Interest
                </Text>
              </Group>
              <Text size="xs" c="dimmed" mb="sm">
                Highlight charts relevant to your focus areas.
              </Text>
              <MultiSelect
                data={[...INTEREST_OPTIONS]}
                value={tempInterests}
                onChange={setTempInterests}
                placeholder="Any topic"
                clearable
                radius="md"
              />
            </Box>

            <Box>
              <Group gap={6} mb={2}>
                <IconCalendarStats size={16} stroke={1.75} />
                <Text size="sm" fw={600}>
                  Years of Interest
                </Text>
              </Group>
              <Text size="xs" c="dimmed" mb="md">
                Restrict trends to{' '}
                <Text span fw={600} c="blue">
                  {tempYearRange[0]}–{tempYearRange[1]}
                </Text>
                .
              </Text>
              <Box px="xs" pt={6}>
                <RangeSlider
                  min={YEAR_MIN_OVERALL}
                  max={YEAR_MAX_OVERALL}
                  step={1}
                  minRange={5}
                  value={tempYearRange}
                  onChange={setTempYearRange}
                  marks={YEAR_MARKS}
                  label={(v) => String(v)}
                  labelTransitionProps={{
                    transition: 'slide-up',
                    duration: 150,
                    timingFunction: 'linear',
                  }}
                  size="sm"
                />
              </Box>
            </Box>
          </SimpleGrid>

          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={closeProfileModal}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Profile</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};
