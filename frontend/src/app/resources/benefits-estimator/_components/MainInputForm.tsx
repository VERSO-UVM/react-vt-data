'use client';

import { useState } from 'react';
import {
  Button,
  Checkbox,
  Collapse,
  Container,
  NumberInput,
  Select,
  Stack,
  Title,
} from '@mantine/core';
import type {
  RawHouseholdData,
  SupplementalInfo,
} from '@/lib/benefitsEstimator/types';
import type {
  ChildAgeRange,
  ChildcareDuration,
  ChildcareType,
} from '@/lib/benefitsEstimator/data/ccfap';

interface InputFormProps {
  onCalculate: (data: RawHouseholdData, supplemental: SupplementalInfo) => void;
}

function SupplementalQuestions({
  data,
  onChange,
}: {
  data: SupplementalInfo;
  onChange: (data: SupplementalInfo) => void;
}) {
  return (
    <Stack gap="xs">
      <Title order={5}>Additional household details:</Title>

      <Checkbox
        label="Household includes a pregnant member"
        checked={data.hasPregnantMember ?? false}
        onChange={(e) =>
          onChange({ ...data, hasPregnantMember: e.currentTarget.checked })
        }
      />

      <Select
        label="Child age for childcare"
        value={data.childAgeRange ?? null}
        onChange={(value) =>
          onChange({ ...data, childAgeRange: value as ChildAgeRange })
        }
        data={[
          { value: 'infant', label: 'Infant (0–2 years)' },
          { value: 'toddler', label: 'Toddler (2–3 years)' },
          { value: 'preschool', label: 'Preschool (3–6 years)' },
          { value: 'schoolAge', label: 'School age (6–13 years)' },
        ]}
      />

      <Select
        label="Childcare duration"
        value={data.childcareDuration ?? null}
        onChange={(value) =>
          onChange({ ...data, childcareDuration: value as ChildcareDuration })
        }
        data={[
          { value: 'partTime', label: 'Part time (1–25 hrs/week)' },
          { value: 'fullTime', label: 'Full time (26–50 hrs/week)' },
          { value: 'extendedCare', label: 'Extended (50+ hrs/week)' },
        ]}
      />

      <Select
        label="Childcare type"
        value={data.childcareType ?? null}
        onChange={(value) =>
          onChange({ ...data, childcareType: value as ChildcareType })
        }
        data={[
          { value: 'licensedCenter', label: 'Licensed center' },
          { value: 'registeredHome', label: 'Registered home' },
        ]}
      />
    </Stack>
  );
}

export default function MainInputForm({ onCalculate }: InputFormProps) {
  const [formData, setFormData] = useState<RawHouseholdData>({
    earnedMonthlyIncome: 0,
    unearnedMonthlyIncome: 0,
    adults: 1,
    children: 0,
    monthlyShelterCost: 0,
    monthlyChildcareCost: 0,
  });

  const [supplemental, setSupplemental] = useState<SupplementalInfo>({
    hasPregnantMember: false,
    childAgeRange: 'preschool',
    childcareDuration: 'fullTime',
    childcareType: 'licensedCenter',
  });

  const [showSupplemental, setShowSupplemental] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onCalculate(formData, supplemental);
  }

  return (
    <Container size="xs">
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <NumberInput
            label="Earned Monthly Income"
            value={formData.earnedMonthlyIncome}
            onChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                earnedMonthlyIncome: Number(value),
              }))
            }
            min={0}
            step={100}
            thousandSeparator=","
            prefix="$"
          />

          <NumberInput
            label="Unearned Monthly Income"
            description="Social Security, disability, child support, etc."
            value={formData.unearnedMonthlyIncome}
            onChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                unearnedMonthlyIncome: Number(value),
              }))
            }
            min={0}
            step={100}
            thousandSeparator=","
            prefix="$"
          />

          <NumberInput
            label="Adults in Household"
            value={formData.adults}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, adults: Number(value) }))
            }
            min={1}
            max={10}
          />

          <NumberInput
            label="Children Under 19 in Household"
            value={formData.children}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, children: Number(value) }))
            }
            min={0}
            max={10}
          />

          <NumberInput
            label="Monthly Shelter Cost"
            description="Rent or mortgage, including utilities if included"
            value={formData.monthlyShelterCost}
            onChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                monthlyShelterCost: Number(value),
              }))
            }
            min={0}
            step={100}
            thousandSeparator=","
            prefix="$"
          />

          <NumberInput
            label="Monthly Childcare Cost"
            value={formData.monthlyChildcareCost}
            onChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                monthlyChildcareCost: Number(value),
              }))
            }
            min={0}
            step={100}
            thousandSeparator=","
            prefix="$"
          />

          <Button
            variant="subtle"
            onClick={() => setShowSupplemental((v) => !v)}
          >
            {showSupplemental ? 'Hide' : 'Show'} additional questions for
            greater accuracy
          </Button>

          <Collapse expanded={showSupplemental}>
            <SupplementalQuestions
              data={supplemental}
              onChange={setSupplemental}
            />
          </Collapse>

          <Button type="submit" fullWidth>
            Calculate Benefits
          </Button>
        </Stack>
      </form>
    </Container>
  );
}
