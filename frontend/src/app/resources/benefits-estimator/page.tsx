'use client';

import { useState } from 'react';
import { Alert, Badge, Center, Group, Stack, Text, Title } from '@mantine/core';
import MainInputForm from './_components/MainInputForm';
import BenefitsDisplay from './_components/BenefitsDisplay';
import calculateBenefits from '@/lib/benefitsEstimator/utils/benefitCalculators';
import processHouseholdData from '@/lib/benefitsEstimator/utils/processHouseholdData';
import type {
  RawHouseholdData,
  SupplementalInfo,
  ProcessedHouseholdData,
  CalculationResult,
} from '@/lib/benefitsEstimator/types';

export default function BenefitsEstimatorPage() {
  const [processedData, setProcessedData] =
    useState<ProcessedHouseholdData | null>(null);
  const [result, setResult] = useState<CalculationResult | null>(null);

  function handleCalculate(
    data: RawHouseholdData,
    supplemental: SupplementalInfo,
  ) {
    const processed = processHouseholdData(data, supplemental);
    setProcessedData(processed);
    setResult(calculateBenefits(processed, supplemental));
  }

  return (
    <Stack gap="xl">
      <Center pt="xl" mb="xs">
        <Group gap="sm" align="center">
          <Title order={2}>Vermont Benefits Estimator</Title>
          <Badge color="orange" variant="filled" size="lg">
            Beta
          </Badge>
        </Group>
      </Center>

      <Center mb="md">
        <Text c="dimmed" size="sm" maw={560} ta="center">
          Estimate eligibility for Vermont benefits programs based on household
          income and composition. Enter your monthly figures below.
        </Text>
      </Center>

      <MainInputForm onCalculate={handleCalculate} />

      {result && processedData && (
        <BenefitsDisplay result={result} processedData={processedData} />
      )}

      <Center pb="xl">
        <Alert
          color="orange"
          variant="light"
          maw={560}
          title="This is an estimate only"
        >
          <Text size="sm">
            The Vermont Benefits Estimator is a work in progress. It does not
            account for all factors involved in benefits determination (e.g.
            medical deductions, assets, immigration status). Always verify
            eligibility against current state guidelines and with the relevant
            agency.
          </Text>
        </Alert>
      </Center>
    </Stack>
  );
}
