import {
  Badge,
  Card,
  Center,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import type {
  BenefitResult,
  CalculationResult,
  ProcessedHouseholdData,
} from '@/lib/benefitsEstimator/types';

function BenefitCard({ benefit }: { benefit: BenefitResult }) {
  const badge = benefit.eligible ? (
    benefit.amount !== undefined && benefit.amount > 0 ? (
      <Badge color="green" size="lg">
        ${benefit.amount}/month
      </Badge>
    ) : (
      <Badge color="green">Eligible</Badge>
    )
  ) : (
    <Badge color="gray">Not eligible</Badge>
  );

  return (
    <Card withBorder mb="sm">
      <Group justify="space-between">
        <Text fw={600}>{benefit.name}</Text>
        {badge}
      </Group>
    </Card>
  );
}

interface ResultsProps {
  result: CalculationResult;
  processedData: ProcessedHouseholdData;
}

export default function BenefitsDisplay({
  result,
  processedData,
}: ResultsProps) {
  return (
    <Container size="xs" mt="xl">
      <Stack gap="lg">
        <Center>
          <Title order={2}>Results</Title>
        </Center>

        <div>
          <Title order={3} mb="sm">
            Income
          </Title>
          <Card withBorder>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text fw={500}>Gross Monthly Income:</Text>
                <Text>${processedData.grossMonthlyIncome.toFixed(2)}</Text>
              </Group>
              <Group justify="space-between">
                <Text fw={500}>Net Monthly Income (after deductions):</Text>
                <Text>${processedData.netMonthlyIncome.toFixed(2)}</Text>
              </Group>
            </Stack>
          </Card>
        </div>

        <div>
          <Title order={3} mb="sm">
            Benefits
          </Title>
          {result.benefits.map((benefit) => (
            <BenefitCard key={benefit.name} benefit={benefit} />
          ))}
        </div>
      </Stack>
    </Container>
  );
}
