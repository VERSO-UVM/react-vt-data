import fs from 'node:fs/promises';
import path from 'node:path';
import mammoth from 'mammoth';

import type { BlogChartSpec } from '../[slug]/BlogChart';

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

// Chart data keyed by id; a paragraph reading [chart:<id>] in the docx
// marks where each one goes.
export async function loadBlogCharts(
  slug: string,
): Promise<Record<string, BlogChartSpec>> {
  try {
    const json = await fs.readFile(
      path.join(CONTENT_DIR, slug, 'charts.json'),
      'utf8',
    );
    return JSON.parse(json);
  } catch (err) {
    // A missing file just means no charts; a JSON typo should fail the build
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw err;
  }
}

// Splits the HTML into [html, chartId, html, chartId, html, ...]
export const splitOnCharts = (html: string) =>
  html.split(/<p>\s*\[chart:\s*([\w-]+)\s*\]\s*<\/p>/);
