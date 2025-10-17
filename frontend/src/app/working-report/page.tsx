'use client';

import { useRef } from 'react';
import html2pdf from 'html2pdf.js';
import {
  Card,
  Container,
  Text,
  Title,
  Button,
  Stack,
  Box,
} from '@mantine/core';
import { useItems } from '@/components/ItemsProvider';
import ChartStack from '@/components/Charts';

import { useShallow } from 'zustand/shallow';
import { ChartItem } from '@/types/cachedCharts';
import { RemoveChart } from '@/components/Charts/saving';
import { Chart } from 'chart.js';

export default function WorkingReport() {
  const componentRef = useRef(null); // Create a ref for our report container

  const charts = useItems(
    useShallow((state) => state.items.filter((item) => item.type === 'chart')),
  ) as ChartItem<any>[];
  const len = charts.length;

  // Function to handle the PDF export with pagination
  const handleDownloadPdf = () => {
    if (!componentRef.current) return;

    // Configuration for html2pdf
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
    <Container size="xl">
      <Stack>
        <Title>Working Report</Title>
        <Text>{`There are currently ${len} charts in the report`}</Text>
        <Button onClick={handleDownloadPdf}>Download as PDF</Button>

        {/* Assign the ref to the container to capture */}
        <div ref={componentRef}>
          <ChartStack charts={charts} action="remove" />
        </div>
      </Stack>
    </Container>
  );
}
