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
  Group,
  Badge,
} from '@mantine/core';
import { useItems } from '@/components/ItemsProvider';
import { ChartStack } from '@/components/Charts';
import { useShallow } from 'zustand/shallow';
import { ChartItem } from '@/types/cachedCharts';
import { PdfModeContext } from '@/contexts/PdfModeContext';
import { useProfile } from '@/components/profile/profileStore';

export default function WorkingReport() {
  const chartsRef = useRef<HTMLDivElement>(null);
  const [isPdfMode, setIsPdfMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const charts = useItems(
    useShallow((state) => state.items.filter((item) => item.type === 'chart')),
  ) as ChartItem<any>[];
  const len = charts.length;

  const locationName = useProfile((state) => state.myLocation.name);

  // ---------------------------------------------------------------------------
  // Legacy html2pdf path (kept as fallback)
  // ---------------------------------------------------------------------------
  const handleDownloadLegacy = async () => {
    if (!chartsRef.current) return;

    flushSync(() => setIsPdfMode(true));

    const options = {
      margin: 10,
      filename: 'working-report.pdf',
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: {
        unit: 'mm' as const,
        format: 'a4',
        orientation: 'portrait' as const,
      },
    };

    await html2pdf().set(options).from(chartsRef.current).save();

    setIsPdfMode(false);
  };

  // ---------------------------------------------------------------------------
  // New @react-pdf/renderer path
  // ---------------------------------------------------------------------------
  const handleDownloadPdf = async () => {
    if (!chartsRef.current) return;
    setIsGenerating(true);

    try {
      // Set PDF mode so SVG fallbacks render and scroll containers unclip
      flushSync(() => setIsPdfMode(true));

      // Small delay to let the DOM settle after the re-render
      await new Promise((r) => setTimeout(r, 300));

      const { generateReportPdf } = await import('@/lib/pdfReport/generatePdf');
      await generateReportPdf(charts, chartsRef.current!, locationName);
    } catch (err) {
      console.error('[WorkingReport] PDF generation failed:', err);
      alert(
        'PDF generation failed — see the browser console for details. ' +
          'Try the legacy download button as a fallback.',
      );
    } finally {
      setIsPdfMode(false);
      setIsGenerating(false);
    }
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
          <Group gap="sm">
            <Button
              size="md"
              onClick={handleDownloadPdf}
              loading={isGenerating}
            >
              Download PDF
            </Button>
            <Button
              size="md"
              variant="light"
              color="gray"
              onClick={handleDownloadLegacy}
              loading={isPdfMode && !isGenerating}
            >
              Download PDF (legacy)
            </Button>
            <Badge color="blue" variant="light" size="sm">
              beta
            </Badge>
          </Group>
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
