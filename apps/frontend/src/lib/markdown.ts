import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({
  gfm: true,
  breaks: true,
});

export function renderMarkdown(rawText: string | null | undefined): string {
  if (!rawText) return '';
  return DOMPurify.sanitize(marked.parse(rawText) as string);
}
