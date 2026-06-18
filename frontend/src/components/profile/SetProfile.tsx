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
  Alert
} from '@mantine/core';
import {
  useProfile,
  INTEREST_OPTIONS,
  YEAR_MIN_OVERALL,
  YEAR_MAX_OVERALL,
  Location,
} from './profileStore';
import county_town_names from '@/data/county_town_names.json';

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

const ProfileLocationSelect: React.FC<ProfileLocationSelectProps> = ({
  title,
  location,
  setLocation,
  showNational = false,
}) => {
  const counties = Object.keys(county_town_names) as CountyKey[];

  return (
    <>
      <Title order={2}>{title}</Title>

      <Select
        label="Area type"
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
    </>
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
      <Button onClick={handleOpen}>My Profile</Button>
      <Modal
        opened={opened}
        onClose={closeProfileModal}
        title="Profile"
        size="md"
        radius="xl"
        padding="xl"
        centered
        shadow="xl"
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
        styles={{
          title: {fontWeight: 600, textAlign: 'center'},
          body: {overflowX: 'hidden'}}}
        >
        <Stack gap="md">
          {!profileSet && (
            <Alert
              variant="light"
              color="blue"
              radius="md"
            >
              Select a profile before beginning. Only your location is required; other fields are optional.
            </Alert>
          )}
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

          <Divider />

          <div>
            <Title order={2}>Areas of Interest</Title>
            <Text size="sm" c="dimmed" mb="xs">
              Highlight and filter charts relevant to your focus areas.
            </Text>
            <MultiSelect
              label="Select topics"
              data={[...INTEREST_OPTIONS]}
              value={tempInterests}
              onChange={setTempInterests}
              placeholder="Any topic"
              clearable
            />
          </div>

          <Divider />

          <div>
            <Title order={2}>Years of Longitudinal Interest</Title>
            <Text size="sm" c="dimmed" mb="xs">
              Restrict trend tables and charts to this year range (
              {tempYearRange[0]}–{tempYearRange[1]}).
            </Text>
            <Box px="xs">
              <RangeSlider
                min={YEAR_MIN_OVERALL}
                max={YEAR_MAX_OVERALL}
                step={1}
                value={tempYearRange}
                onChange={setTempYearRange}
                marks={YEAR_MARKS}
                label={(v) => String(v)}
                mt="xs"
                mb="xl"
              />
            </Box>
          </div>

          <Button onClick={handleSave}>Save Profile</Button>
        </Stack>
      </Modal>
    </>
  );
};
