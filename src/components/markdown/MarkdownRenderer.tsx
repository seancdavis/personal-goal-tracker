interface MarkdownRendererProps {
  html: string;
  className?: string;
}

export function MarkdownRenderer({ html, className = "" }: MarkdownRendererProps) {
  return (
    <div
      className={`prose prose-sm max-w-none prose-headings:font-semibold prose-a:text-green-600 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
