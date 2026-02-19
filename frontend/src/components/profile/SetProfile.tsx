import React, { useState } from 'react';
import {
  Button,
  Divider,
  Modal,
  MultiSelect,
  Select,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useProfile, INTEREST_OPTIONS, Location } from './profileStore';
import county_town_names from '@/Data/county_town_names.json';

type CountyKey = keyof typeof county_town_names;

interface ProfileLocationSelectProps {
  title: string;
  location: Location;
  setLocation: (loc: Location) => void;
}

const getName = (
  type: string,
  county?: string | null,
  town?: string | null,
) => {
  if (type === 'state') return 'Vermont';
  if (type === 'county' && county) return `${county} County, Vermont`;
  if (type === 'town' && county && town)
    return `${town}, ${county} County, Vermont`;
  return 'Unknown';
};

const ProfileLocationSelect: React.FC<ProfileLocationSelectProps> = ({
  title,
  location,
  setLocation,
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
          const newType = value as 'state' | 'county' | 'town';
          setLocation({
            type: newType,
            state: newType === 'state',
            county: newType === 'town' ? location.county : null,
            town: null,
            name: getName(newType, newType === 'town' ? location.county : null),
          });
        }}
        data={[
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

export const ProfileModal: React.FC = () => {
  const {
    myLocation,
    setLocation,
    comparison,
    setComparison,
    interests,
    setInterests,
  } = useProfile();
  const [opened, setOpened] = useState(false);

  const [tempMyLocation, setTempMyLocation] = useState<Location>(myLocation);
  const [tempComparison, setTempComparison] = useState<Location>(comparison);
  const [tempInterests, setTempInterests] = useState<string[]>(interests);

  const handleOpen = () => {
    // Sync temp state from store each time the modal opens
    setTempMyLocation(myLocation);
    setTempComparison(comparison);
    setTempInterests(interests);
    setOpened(true);
  };

  const handleSave = () => {
    setLocation(tempMyLocation);
    setComparison(tempComparison);
    setInterests(tempInterests);
    setOpened(false);
  };

  return (
    <>
      <Button onClick={handleOpen}>Set Profile</Button>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Set Profile"
        size="md"
      >
        <Stack gap="md">
          <ProfileLocationSelect
            title="My Location"
            location={tempMyLocation}
            setLocation={setTempMyLocation}
          />
          <ProfileLocationSelect
            title="Comparison"
            location={tempComparison}
            setLocation={setTempComparison}
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

          <Button onClick={handleSave}>Save</Button>
        </Stack>
      </Modal>
    </>
  );
};
