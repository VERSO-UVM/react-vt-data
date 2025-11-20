'use client';

import { useRef } from 'react';
import html2pdf from 'html2pdf.js';
import {
  Container,
  Text,
  Title,
  Button,
  Center,
  Stack,
  Card,
} from '@mantine/core';
import { useItems } from '@/components/ItemsProvider';
import { ChartStack } from '@/components/Charts';
import { useShallow } from 'zustand/shallow';
import { ChartItem } from '@/types/cachedCharts';

export default function WorkingReport() {
  const componentRef = useRef<HTMLDivElement>(null);

  const charts = useItems(
    useShallow((state) => state.items.filter((item) => item.type === 'chart')),
  ) as ChartItem<any>[];
  const len = charts.length;

  const handleDownloadPdf = () => {
    if (!componentRef.current) return;

    const options = {
      margin: 10,
      filename: 'working-report.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    html2pdf().set(options).from(componentRef.current).save();
  };

  return (
    <Container size="xl" py="xl">
      <Stack spacing="xl">
        <Center direction="column" spacing="sm">
          <Title order={2}>Working Report</Title>
        </Center>
        <Center direction="column" spacing="sm">
          <Text color="dimmed">{`There are currently ${len} charts in the report`}</Text>
        </Center>

        <Center>
          <Button size="md" onClick={handleDownloadPdf}>
            Download PDF
          </Button>
        </Center>

        <ChartStack charts={charts} action="remove" />
      </Stack>
    </Container>
  );
}
