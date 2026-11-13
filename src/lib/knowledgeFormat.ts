/**
 * Splits a Nandia knowledge section's plain text into displayable structure.
 * The teach chat and the seed SQL write sections as:
 *   "Дэд гарчиг:"            → heading (short line ending with ":")
 *   "- item"                 → bullet
 *   "1. step"                → numbered step
 *   "Цэс → Суваг → Гарах"    → menu path (2+ arrows)
 *   anything else            → plain text
 */

export type KnowledgeBlock =
  | { kind: "bullet"; text: string }
  | { kind: "step"; n: string; text: string }
  | { kind: "path"; parts: string[] }
  | { kind: "text"; text: string };

export interface KnowledgeGroup {
  /** null for lines before the first heading. */
  heading: string | null;
  blocks: KnowledgeBlock[];
}

const HEADING = /^[^-•*\d].{0,90}:$/;

export function parseKnowledge(content: string): KnowledgeGroup[] {
  const groups: KnowledgeGroup[] = [];
  let current: KnowledgeGroup = { heading: null, blocks: [] };

  for (const raw of content.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    if (HEADING.test(line) && !line.includes("→")) {
      if (current.heading !== null || current.blocks.length > 0) groups.push(current);
      current = { heading: line.slice(0, -1).trim(), blocks: [] };
      continue;
    }
    const bullet = /^[-•*]\s+(.*)$/.exec(line);
    if (bullet) {
      current.blocks.push({ kind: "bullet", text: bullet[1] });
      continue;
    }
    const step = /^(\d+)[.)]\s+(.*)$/.exec(line);
    if (step) {
      current.blocks.push({ kind: "step", n: step[1], text: step[2] });
      continue;
    }
    const parts = line.split("→").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      current.blocks.push({ kind: "path", parts });
      continue;
    }
    current.blocks.push({ kind: "text", text: line });
  }

  if (current.heading !== null || current.blocks.length > 0) groups.push(current);
  return groups;
}

/** One-line version of a block for the schema view. */
export function blockSummary(block: KnowledgeBlock, max = 90): string {
  const text = block.kind === "path" ? block.parts.join(" → ") : block.text;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
