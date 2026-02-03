import { marked } from "marked";

// Configure marked for safe rendering
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Convert markdown to HTML
 */
export async function renderMarkdown(markdown: string): Promise<string> {
  return await marked.parse(markdown);
}

/**
 * Synchronous markdown rendering (for simpler use cases)
 */
export function renderMarkdownSync(markdown: string): string {
  return marked.parse(markdown) as string;
}
