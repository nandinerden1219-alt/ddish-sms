import type { Content } from "@google/genai";
import { errorResponse, generateGeminiJson } from "@/lib/ai/gemini";
import {
  buildTeachPrompt,
  TEACH_SCHEMA,
  type TeachAction,
  type TeachResult,
  type TeachSection,
} from "@/lib/assistant/teachPrompt";
import { createClient } from "@/lib/supabase/server";

const MAX_TURNS = 20;
const MAX_MESSAGE_LENGTH = 8000;

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface AppliedChange {
  type: "create" | "update";
  id: string;
  title: string;
  summary: string;
  /** For updates: the section as it was before this message, so it can be undone. */
  previous?: { title: string; content: string };
}

function parseMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value)) return null;
  const messages: ChatMessage[] = [];
  for (const m of value) {
    if (!m || typeof m !== "object") return null;
    const { role, text } = m as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof text !== "string") return null;
    const trimmed = text.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (trimmed) messages.push({ role, text: trimmed });
  }
  return messages;
}

/** Drops malformed actions and edits that point at a section that doesn't exist. */
function sanitizeActions(raw: unknown, sections: TeachSection[]): TeachAction[] {
  if (!Array.isArray(raw)) return [];
  const ids = new Set(sections.map((s) => s.id));
  const actions: TeachAction[] = [];
  for (const a of raw) {
    if (!a || typeof a !== "object") continue;
    const { type, id, title, find, content, summary } = a as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" ? v : "");
    if (type === "create") {
      if (!str(title).trim() || !str(content).trim()) continue;
      actions.push({
        type,
        id: "",
        title: str(title).trim().slice(0, 200),
        find: "",
        content: str(content).trim(),
        summary: str(summary).trim(),
      });
    } else if (type === "edit") {
      if (!ids.has(str(id))) continue;
      // Appending nothing is a no-op; deleting needs something to find.
      if (!str(find) && !str(content).trim()) continue;
      actions.push({
        type,
        id: str(id),
        title: "",
        find: str(find),
        content: str(content),
        summary: str(summary).trim(),
      });
    }
  }
  return actions;
}

/**
 * Line endings as "\n" and no trailing spaces on lines. Text pasted through the
 * Supabase SQL editor is stored with "\r\n", which the model never reproduces.
 */
function normalizeText(s: string): string {
  return s.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n");
}

/** Applies one edit to a section's (normalized) text; null when `find` isn't in it. */
function applyEdit(current: string, edit: TeachAction): string | null {
  const replacement = normalizeText(edit.content);
  if (!edit.find) return `${current.trimEnd()}\n${replacement.trim()}`;
  const find = normalizeText(edit.find);
  if (!current.includes(find)) return null;
  // Function replacer so "$" in the new text is never treated as a pattern.
  return current.replace(find, () => replacement);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Админаар нэвтэрнэ үү.", 401);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Буруу хүсэлт.", 400);
  }

  const parsed = parseMessages(body.messages);
  if (!parsed || parsed.length === 0 || parsed.at(-1)!.role !== "user") {
    return errorResponse("Мэдээллээ бичнэ үү.", 400);
  }
  const recent = parsed.slice(-MAX_TURNS);
  while (recent.length > 0 && recent[0].role !== "user") recent.shift();

  const { data, error } = await supabase
    .from("assistant_knowledge")
    .select("id, title, content, is_active, display_order")
    .order("display_order");
  if (error) {
    console.error("Knowledge fetch failed:", error.message);
    return errorResponse("Мэдлэгийг уншиж чадсангүй.", 500);
  }
  const rows = (data ?? []) as (TeachSection & { display_order: number })[];

  const contents: Content[] = recent.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.text }],
  }));

  const result = await generateGeminiJson<TeachResult>(buildTeachPrompt(rows), contents, TEACH_SCHEMA);
  if ("error" in result) return result.error;

  // Apply straight away with the admin's own session (RLS as for the admin
  // forms). Edits are applied in memory first so several edits to one section
  // become a single update with one undo point.
  const working = new Map(rows.map((r) => [r.id, normalizeText(r.content)]));
  const editSummaries = new Map<string, string[]>();
  const changes: AppliedChange[] = [];
  let nextOrder = rows.reduce((max, r) => Math.max(max, r.display_order), 0) + 1;
  let failed = 0;
  let notFound = 0;

  for (const action of sanitizeActions(result.data.actions, rows)) {
    if (action.type === "create") {
      const { data: inserted, error: insertError } = await supabase
        .from("assistant_knowledge")
        .insert({ title: action.title, content: action.content, display_order: nextOrder++, is_active: true })
        .select("id")
        .single();
      if (insertError || !inserted) {
        console.error("Knowledge insert failed:", insertError?.message);
        failed++;
        continue;
      }
      changes.push({ type: "create", id: inserted.id as string, title: action.title, summary: action.summary });
      continue;
    }

    const next = applyEdit(working.get(action.id)!, action);
    if (next === null) {
      console.warn("Knowledge edit: text to replace not found:", JSON.stringify(action.find).slice(0, 300));
      notFound++;
      continue;
    }
    working.set(action.id, next);
    editSummaries.set(action.id, [...(editSummaries.get(action.id) ?? []), action.summary].filter(Boolean));
  }

  for (const [id, summaries] of editSummaries) {
    const original = rows.find((r) => r.id === id)!;
    const { error: updateError } = await supabase
      .from("assistant_knowledge")
      .update({ content: working.get(id) })
      .eq("id", id);
    if (updateError) {
      console.error("Knowledge update failed:", updateError.message);
      failed++;
      continue;
    }
    changes.push({
      type: "update",
      id,
      title: original.title,
      summary: summaries.join(" "),
      previous: { title: original.title, content: original.content },
    });
  }

  let reply = typeof result.data.reply === "string" ? result.data.reply : "";
  if (notFound > 0) {
    reply += `\n⚠️ ${notFound} засварын солих мөрийг мэдлэгээс олсонгүй, тиймээс хийгээгүй. Өөрөөр тайлбарлаад дахин бичнэ үү.`;
  }
  if (failed > 0) reply += `\n⚠️ ${failed} өөрчлөлтийг хадгалж чадсангүй. Дахин оролдоно уу.`;
  return Response.json({ reply, changes });
}
