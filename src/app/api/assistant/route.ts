import type { Content } from "@google/genai";
import { errorResponse, streamGemini } from "@/lib/ai/gemini";
import { getSmsTemplates } from "@/lib/ai/smsTemplates";
import { buildSystemPrompt, knowledgeHint, type KnowledgeSection } from "@/lib/assistant/prompt";
import { selectContext } from "@/lib/assistant/retrieval";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const MAX_TURNS = 20;
const MAX_MESSAGE_LENGTH = 4000;
// Short so admin edits to the knowledge reach the assistant within a minute.
const KNOWLEDGE_TTL_MS = 60 * 1000;

let knowledgeCache: { at: number; sections: KnowledgeSection[] } | null = null;

async function getKnowledge(): Promise<KnowledgeSection[]> {
  if (knowledgeCache && Date.now() - knowledgeCache.at < KNOWLEDGE_TTL_MS) return knowledgeCache.sections;

  let sections: KnowledgeSection[] = [];
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("assistant_knowledge")
      .select("title, content")
      .eq("is_active", true)
      .order("display_order");
    // PGRST205: migration not run yet — answer without the knowledge base.
    if (error && error.code !== "PGRST205") console.error("Knowledge fetch failed:", error.message);
    sections = (data ?? []).map((r) => ({ title: r.title as string, content: r.content as string }));
  }
  knowledgeCache = { at: Date.now(), sections };
  return sections;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
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

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Буруу хүсэлт.", 400);
  }

  const parsed = parseMessages(body.messages);
  if (!parsed || parsed.length === 0 || parsed.at(-1)!.role !== "user") {
    return errorResponse("Асуултаа бичнэ үү.", 400);
  }

  // Keep the recent turns; the conversation must open with a user message.
  const recent = parsed.slice(-MAX_TURNS);
  while (recent.length > 0 && recent[0].role !== "user") recent.shift();

  const contents: Content[] = recent.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.text }],
  }));

  const [knowledge, templates] = await Promise.all([getKnowledge(), getSmsTemplates()]);
  const userTexts = recent.filter((m) => m.role === "user").map((m) => m.text);

  // Pick the sections and CKB pieces this question needs (before the hint is appended).
  const context = await selectContext(knowledge, contents, userTexts);

  const hint = knowledgeHint(knowledge, userTexts);
  if (hint) contents.at(-1)!.parts!.push({ text: hint });

  return streamGemini(buildSystemPrompt(knowledge, context.sections, templates, context.docs), contents);
}
