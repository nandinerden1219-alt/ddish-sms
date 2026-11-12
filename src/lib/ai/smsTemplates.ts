/**
 * SMS template titles given to the AI assistants so an answer can name one.
 * Server-only.
 */
import { isSupabaseConfigured } from "@/lib/env";
import { MOCK_ITEMS } from "@/lib/mockData";
import { createClient } from "@/lib/supabase/server";

export interface SmsTemplate {
  title: string;
  /** Category name; "" when unknown. */
  category: string;
}

const TTL_MS = 5 * 60 * 1000;
let cache: { at: number; templates: SmsTemplate[] } | null = null;

/**
 * Active template titles with their category name (the category tells the
 * model what a title is for), cached briefly so each question skips the DB.
 */
export async function getSmsTemplates(): Promise<SmsTemplate[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.templates;

  let templates: SmsTemplate[];
  if (!isSupabaseConfigured) {
    templates = MOCK_ITEMS.map((i) => ({ title: i.title, category: "" }));
  } else {
    const supabase = await createClient();
    const [itemsRes, categoriesRes] = await Promise.all([
      supabase.from("information_items").select("title, category_id").eq("is_active", true).order("display_order"),
      supabase.from("categories").select("id, name"),
    ]);
    // Without templates the assistant still answers; it just can't point to one.
    const names = new Map((categoriesRes.data ?? []).map((c) => [c.id as string, c.name as string]));
    templates = itemsRes.error
      ? []
      : (itemsRes.data ?? []).map((r) => ({
          title: r.title as string,
          category: names.get(r.category_id as string) ?? "",
        }));
  }
  cache = { at: Date.now(), templates };
  return templates;
}

export function formatSmsTemplates(templates: SmsTemplate[]): string {
  if (templates.length === 0) return "Байхгүй.";
  return templates
    .map((t) => (t.category ? `- ${t.title}  (ангилал: ${t.category})` : `- ${t.title}`))
    .join("\n");
}
