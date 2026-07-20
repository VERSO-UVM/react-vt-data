import {
  Badge,
  Card,
  Center,
  Container,
  Group,
  Stack,
  Text,
  Title,
  Divider,
  Paper,
} from '@mantine/core';
import type {
  BenefitResult,
  CalculationResult,
  ProcessedHouseholdData,
} from '@/lib/benefitsEstimator/types';

/* ---------------- BENEFIT CARD ---------------- */

function BenefitCard({ benefit }: { benefit: BenefitResult }) {
  const badge = benefit.eligible ? (
    benefit.amount !== undefined && benefit.amount > 0 ? (
      <Badge color="green" size="lg" variant="light">
        ${benefit.amount}/mo
      </Badge>
    ) : (
      <Badge color="green" variant="light">
        Eligible
      </Badge>
    )
  ) : (
    <Badge color="gray" variant="light">
      Not eligible
    </Badge>
  );

  return (
    <Card
      withBorder
      radius="md"
      p="md"
      style={{
        transition: 'all 150ms ease',
      }}
    >
      <Group justify="space-between">
        <Text fw={600} size="sm">
          {benefit.name}
        </Text>
        {badge}
      </Group>
    </Card>
  );
}

/* ---------------- MAIN ---------------- */

interface ResultsProps {
  result: CalculationResult;
  processedData: ProcessedHouseholdData;
}

export default function BenefitsDisplay({
  result,
  processedData,
}: ResultsProps) {
  return (
    <Container size="sm" py="xl">
      {/* HEADER */}
      <Center mb="lg">
        <Stack align="center" gap={4}>
          <Title order={2}>Benefit Results</Title>
          <Text size="sm" c="dimmed" ta="center">
            Estimated eligibility and monthly benefit amounts based on your
            inputs
          </Text>
        </Stack>
      </Center>

      <Stack gap="lg">
        {/* ================= SUMMARY CARD ================= */}
        <Paper withBorder radius="md" p="lg" shadow="xs">
          <Title order={3} mb="sm">
            Income Summary
          </Title>

          <Divider mb="md" />

          <Stack gap="sm">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Gross Monthly Income
              </Text>
              <Text fw={600}>
                ${processedData.grossMonthlyIncome.toFixed(2)}
              </Text>
            </Group>

            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Net Monthly Income
              </Text>
              <Text fw={600}>${processedData.netMonthlyIncome.toFixed(2)}</Text>
            </Group>
          </Stack>
        </Paper>

        {/* ================= BENEFITS ================= */}
        <div>
          <Group justify="space-between" mb="xs">
            <Title order={3}>Eligible Programs</Title>

            <Badge variant="light" color="blue">
              {result.benefits.filter((b) => b.eligible).length} found
            </Badge>
          </Group>

          <Stack gap="sm">
            {result.benefits.map((benefit) => (
              <BenefitCard key={benefit.name} benefit={benefit} />
            ))}
          </Stack>
        </div>
      </Stack>
    </Container>
  );
}
