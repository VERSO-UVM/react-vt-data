import fs from 'node:fs/promises';
import path from 'node:path';
import mammoth from 'mammoth';

const CONTENT_DIR = path.join(
  process.cwd(),
  'src/app/resources/white-papers/content',
);

// Converts a white paper's content.docx (paragraphs, headings, links, lists)
// into HTML at build time, so authors can write in Word instead of JSX.
export async function loadWhitePaperHtml(slug: string): Promise<string> {
  const docxPath = path.join(CONTENT_DIR, slug, 'content.docx');

  try {
    const buffer = await fs.readFile(docxPath);
    const { value } = await mammoth.convertToHtml({ buffer });
    return value;
  } catch {
    return '<p><em>Content coming soon &mdash; add a content.docx file to this white paper&rsquo;s content folder.</em></p>';
  }
}
