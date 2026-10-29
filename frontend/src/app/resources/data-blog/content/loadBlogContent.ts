import fs from 'node:fs/promises';
import path from 'node:path';
import mammoth from 'mammoth';

const CONTENT_DIR = path.join(
  process.cwd(),
  'src/app/resources/data-blog/content',
);

// Converts a blog's content.docx (paragraphs, headings, links, lists)
// into HTML at build time, so authors can write in Word instead of JSX.
export async function loadBlogHtml(slug: string): Promise<string> {
  const docxPath = path.join(CONTENT_DIR, slug, 'content.docx');

  try {
    const buffer = await fs.readFile(docxPath);
    const { value } = await mammoth.convertToHtml({ buffer });
    return value;
  } catch {
    return '<p><em>Content coming soon &mdash; add a content.docx file to this blog&rsquo;s content folder.</em></p>';
  }
}
