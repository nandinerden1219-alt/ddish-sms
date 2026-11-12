import type { InformationItem } from "@/types";

/**
 * Renders an AI answer: one paragraph per line, **bold** and *italic*
 * segments styled, everything else plain text (no HTML is interpreted).
 */
export default function AnswerText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <p key={i} className={line.trim() ? undefined : "h-2"}>
          {renderInline(line)}
        </p>
      ))}
    </>
  );
}

function renderInline(line: string) {
  return line.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).map((part, i) => {
    if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={i} className="text-neutral-600">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

/** SMS templates whose exact title appears in the answer (at most 3). */
export function findMentionedItems(items: InformationItem[], text: string): InformationItem[] {
  return items.filter((item) => item.title.trim() && text.includes(item.title.trim())).slice(0, 3);
}
