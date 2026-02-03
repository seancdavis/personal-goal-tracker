import { useState } from "react";
import { Eye, Edit3 } from "lucide-react";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { renderMarkdownSync } from "@/lib/markdown";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write your content here... (supports Markdown)",
}: MarkdownEditorProps) {
  const [preview, setPreview] = useState(false);

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-300">
        <span className="text-sm text-gray-600">Markdown supported</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setPreview(!preview)}
        >
          {preview ? (
            <>
              <Edit3 className="w-4 h-4 mr-1" />
              Edit
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </>
          )}
        </Button>
      </div>
      {preview ? (
        <div className="p-4 min-h-[150px]">
          {value ? (
            <MarkdownRenderer html={renderMarkdownSync(value)} />
          ) : (
            <p className="text-gray-400 italic">Nothing to preview</p>
          )}
        </div>
      ) : (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="border-0 rounded-none focus:ring-0 min-h-[150px]"
        />
      )}
    </div>
  );
}
