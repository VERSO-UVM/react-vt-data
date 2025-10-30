import React, { useState } from 'react';
import { Modal, Button, Stack, Select, Title } from '@mantine/core';
import { useProfile } from './profileStore';
import county_town_names from '@/Data/county_town_names.json';

interface ProfileLocationSelectProps {
  title: string;
  type: 'state' | 'county' | 'town' | 'rpc';
  setType: (type: 'state' | 'county' | 'town') => void;
  county?: string | null;
  town?: string | null;
  setLocation: (loc: {
    type: string;
    state?: boolean;
    county?: string | null;
    town?: string | null;
  }) => void;
}

const ProfileLocationSelect: React.FC<ProfileLocationSelectProps> = ({
  title,
  type,
  setType,
  county,
  town,
  setLocation,
}) => {
  const counties = Object.keys(county_town_names);

  return (
    <>
      <Title order={2}>{title}</Title>
      {/* Select the level we're interested in */}
      <Select
        label="Area type"
        value={type}
        onChange={(value) => {
          if (!value) return;
          setType(value as 'state' | 'county' | 'town');
          setLocation({
            type: value,
            state: value === 'state',
            county: value === 'town' ? county : null, // preserve existing county when switching to town
            town: null,
          });
        }}
        data={[
          { value: 'state', label: 'All of Vermont' },
          { value: 'county', label: 'County' },
          { value: 'town', label: 'Town' },
        ]}
      />

      {(type === 'county' || type === 'town') && (
        <Select
          label="Pick a county"
          value={county || ''}
          onChange={(value) =>
            value && setLocation({ type, county: value, town: null })
          }
          data={counties.map((c) => ({ value: c, label: c }))}
        />
      )}

      {type === 'town' && county && (
        <Select
          label="Pick a town"
          value={town || ''}
          onChange={(value) =>
            value && setLocation({ type, county, town: value })
          }
          data={county_town_names[county].map((t) => ({ value: t, label: t }))}
        />
      )}
    </>
  );
};

export const ProfileModal: React.FC = () => {
  const [opened, setOpened] = useState(false);
  const { myLocation, setLocation, comparison, setComparison } = useProfile();
  const [myType, setMyType] = useState(myLocation.type);
  const [compType, setCompType] = useState(comparison.type);

  const counties = Object.keys(county_town_names);
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
            type={myType}
            setType={setMyType}
            county={myLocation.county}
            town={myLocation.town}
            setLocation={setLocation}
          />

          <ProfileLocationSelect
            title="Comparison (optional)"
            type={compType}
            setType={setCompType}
            county={comparison.county}
            town={comparison.town}
            setLocation={setComparison}
          />
        </Stack>
      </Modal>
      {console.log('mylocation', myLocation, 'comparison', comparison)}
    </>
  );
};
