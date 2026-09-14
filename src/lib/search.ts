import type { Category, InformationItem } from "@/types";
import { transliterate } from "./utils";

/**
 * Normalises text for matching so that Cyrillic and romanised Mongolian
 * find each other: "сунгалт" and "sungalt" both become "sungalt", and the
 * common romanisation variants collapse to one form (w/v, kh/h, and long
 * vowels: "khaan"/"khan", "dugaar"/"dugar").
 */
export function normalizeForSearch(text: string): string {
  return transliterate(text)
    .replace(/kh/g, "h")
    .replace(/w/g, "v")
    .replace(/([a-z])\1+/g, "$1")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Every query word must appear somewhere in the item (in any order).
 * Results are ranked: title hits first, then keywords, category, body.
 */
export function searchItems(
  items: InformationItem[],
  query: string,
  categoriesById: Record<string, Category>
): InformationItem[] {
  const q = normalizeForSearch(query);
  if (!q) return items;
  const tokens = q.split(" ").filter(Boolean);

  const scored: { item: InformationItem; score: number }[] = [];

  for (const item of items) {
    const category = item.category_id ? categoriesById[item.category_id] : undefined;
    const title = normalizeForSearch(item.title);
    const keywords = normalizeForSearch(item.keywords ?? "");
    const catName = normalizeForSearch(category?.name ?? "");
    const message = normalizeForSearch(item.message);
    const additional = normalizeForSearch(item.additional_info ?? "");
    const haystack = `${title} ${keywords} ${catName} ${message} ${additional}`;

    if (!tokens.every((t) => haystack.includes(t))) continue;

    let score = 0;
    if (title.startsWith(q)) score += 60;
    if (title.includes(q)) score += 40;
    for (const t of tokens) {
      if (title.includes(t)) score += 10;
      if (keywords.includes(t)) score += 8;
      if (catName.includes(t)) score += 4;
      if (message.includes(t)) score += 2;
      if (additional.includes(t)) score += 1;
    }
    scored.push({ item, score });
  }

  scored.sort((a, b) => b.score - a.score || a.item.display_order - b.item.display_order);
  return scored.map((s) => s.item);
}

export const filterItemsBySearch = searchItems;
