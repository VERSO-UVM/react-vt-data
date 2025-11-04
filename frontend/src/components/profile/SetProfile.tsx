import React, { useState } from 'react';
import { Modal, Button, Stack, Select, Title } from '@mantine/core';
import { useProfile } from './profileStore';
import county_town_names from '@/Data/county_town_names.json';

interface ProfileLocation {
  type: 'state' | 'county' | 'town' | 'rpc';
  state?: boolean;
  county?: string | null;
  town?: string | null;
  name?: string; // only used internally
}

interface ProfileLocationSelectProps {
  title: string;
  location: ProfileLocation;
  setLocation: (loc: ProfileLocation) => void;
}

const ProfileLocationSelect: React.FC<ProfileLocationSelectProps> = ({
  title,
  location,
  setLocation,
}) => {
  const counties = Object.keys(county_town_names);

  const getName = (
    type: string,
    county?: string | null,
    town?: string | null,
  ) => {
    if (type === 'state') return 'Vermont';
    if (type === 'county' && county) return county;
    if (type === 'town' && county && town) return `${town}, ${county}`;
    return 'Unknown';
  };

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
          data={county_town_names[location.county].map((t) => ({
            value: t,
            label: t,
          }))}
        />
      )}
    </>
  );
};

export const ProfileModal: React.FC = () => {
  const { myLocation, setLocation, comparison, setComparison } = useProfile();
  const [opened, setOpened] = useState(false);

  const [tempMyLocation, setTempMyLocation] =
    useState<ProfileLocation>(myLocation);
  const [tempComparison, setTempComparison] =
    useState<ProfileLocation>(comparison);

  const handleSave = () => {
    setLocation(tempMyLocation);
    setComparison(tempComparison);
    setOpened(false);
  };

  return (
    <>
      <Button onClick={() => setOpened(true)}>Set Profile</Button>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Set Profile Location"
      >
        <Stack spacing="md">
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
          <Button onClick={handleSave}>Set</Button>
        </Stack>
      </Modal>
    </>
  );
};
