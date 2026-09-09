import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ExportOptions {
  title: string;
  primaryName: string;
  comparisonName: string;
  year: number;
}

export async function exportReport(
  containerId: string,
  options: ExportOptions,
) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // 1. Target individual sections/cards to avoid breaking components mid-page
  const sections = Array.from(
    container.querySelectorAll<HTMLElement>('.pdf-export-block'),
  );

  if (sections.length === 0) {
    console.warn('No .pdf-export-block elements found for PDF rendering.');
    return;
  }

  // Initialize PDF (A4 size in mm)
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const margin = 12; // 12mm margins
  const contentWidth = pdfWidth - margin * 2;
  let currentY = margin;

  // 2. Add Modern PDF Cover Header
  pdf.setFillColor(27, 58, 47); // Dark Green background matching dashboard header
  pdf.rect(0, 0, pdfWidth, 24, 'F');

  pdf.setTextColor(246, 245, 239);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${options.title} Benchmark Report`, margin, 12);

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(
    `Geography: ${options.primaryName} vs. ${options.comparisonName} | ACS ${options.year}`,
    margin,
    18,
  );

  currentY = 32; // Start position below header banner

  // 3. Render each chart component card to canvas
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    const canvas = await html2canvas(section, {
      scale: 2, // High resolution sharp capture
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    // 4. Page Break Handling: Check if chart fits on current page
    if (currentY + imgHeight > pdfHeight - margin) {
      pdf.addPage();
      currentY = margin; // Reset top margin on new page
    }

    pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
    currentY += imgHeight + 8; // 8mm spacing between chart cards
  }

  // 5. Add Footer Page Numbers
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Page ${i} of ${pageCount} — The Vermont Data Collaborative`,
      pdfWidth / 2,
      pdfHeight - 6,
      { align: 'center' },
    );
  }

  // Save File
  const filename =
    `${options.primaryName}_vs_${options.comparisonName}_${options.title}_${options.year}.pdf`
      .toLowerCase()
      .replace(/\s+/g, '_');

  pdf.save(filename);
}
