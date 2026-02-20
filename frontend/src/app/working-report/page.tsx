'use client';

import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import html2pdf from 'html2pdf.js';
import {
  Container,
  Text,
  Title,
  Button,
  Center,
  Stack,
} from '@mantine/core';
import { useItems } from '@/components/ItemsProvider';
import { ChartStack } from '@/components/Charts';
import { useShallow } from 'zustand/shallow';
import { ChartItem } from '@/types/cachedCharts';
import { PdfModeContext } from '@/contexts/PdfModeContext';

export default function WorkingReport() {
  const chartsRef = useRef<HTMLDivElement>(null);
  const [isPdfMode, setIsPdfMode] = useState(false);

  const charts = useItems(
    useShallow((state) => state.items.filter((item) => item.type === 'chart')),
  ) as ChartItem<any>[];
  const len = charts.length;

  const handleDownloadPdf = async () => {
    if (!chartsRef.current) return;

    // Switch to PDF mode synchronously so React re-renders SVG charts and
    // unclips containers before html2canvas rasterizes the DOM.
    flushSync(() => setIsPdfMode(true));

    const options = {
      margin: 10,
      filename: 'working-report.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    await html2pdf().set(options).from(chartsRef.current).save();

    setIsPdfMode(false);
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Center>
          <Title order={2}>Working Report</Title>
        </Center>
        <Center>
          <Text c="dimmed">{`There are currently ${len} charts in the report`}</Text>
        </Center>

        <Center>
          <Button size="md" onClick={handleDownloadPdf} loading={isPdfMode}>
            Download PDF
          </Button>
        </Center>

        <PdfModeContext.Provider value={isPdfMode}>
          <div ref={chartsRef}>
            <ChartStack charts={charts} action="remove" />
          </div>
        </PdfModeContext.Provider>
      </Stack>
    </Container>
  );
}
