/**
 * Picks what Nandia reads for one question. The whole knowledge base (own
 * sections + ~470 CKB pieces, ~400k characters) is too big to send every time,
 * so a quick Gemini call chooses the relevant items from a list of titles.
 * Server-only: used by app/api/assistant/route.ts.
 */
import { ThinkingLevel, type Content } from "@google/genai";
import { generateGeminiJson } from "@/lib/ai/gemini";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { findMentionedDevice, type CkbDoc, type KnowledgeSection } from "./prompt";

const DOCS_TTL_MS = 5 * 60 * 1000;
/** Sections at most this long (and "all devices" ones) are always sent. */
const ALWAYS_INCLUDE_CHARS = 3000;
/** A CKB article up to this size is one routing item; bigger ones are listed per part. */
const WHOLE_ARTICLE_CHARS = 10000;
/** Upper bound on CKB text sent with one question. */
const MAX_DOC_CHARS = 30000;
const MAX_PICKS = 6;

let docsCache: { at: number; docs: CkbDoc[] } | null = null;

async function getCkbDocs(): Promise<CkbDoc[]> {
  if (docsCache && Date.now() - docsCache.at < DOCS_TTL_MS) return docsCache.docs;
  let docs: CkbDoc[] = [];
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ckb_docs")
      .select("chunk_key, short_id, category, article_title, part, content, url, source_updated_at")
      .order("category")
      .order("article_title")
      .order("chunk_key")
      .limit(5000);
    // PGRST205: table not created yet — Nandia works from its own sections only.
    if (error && error.code !== "PGRST205") console.error("CKB docs fetch failed:", error.message);
    docs = (data ?? []) as CkbDoc[];
  }
  docsCache = { at: Date.now(), docs };
  return docs;
}

interface RoutingItem {
  id: string;
  label: string;
  section?: KnowledgeSection;
  docs: CkbDoc[];
}

/** " (2026-07-08)" — lets the router prefer the newest of several articles on one topic. */
function dated(d: CkbDoc): string {
  return d.source_updated_at ? ` (${d.source_updated_at.slice(0, 10)})` : "";
}

function buildItems(sections: KnowledgeSection[], docs: CkbDoc[]): RoutingItem[] {
  const items: RoutingItem[] = sections.map((s, i) => ({
    id: `k${i + 1}`,
    label: `Мэдлэг › ${s.title}`,
    section: s,
    docs: [],
  }));

  const byArticle = new Map<string, CkbDoc[]>();
  for (const d of docs) {
    if (!byArticle.has(d.short_id)) byArticle.set(d.short_id, []);
    byArticle.get(d.short_id)!.push(d);
  }
  let n = 0;
  for (const pieces of byArticle.values()) {
    const first = pieces[0];
    const size = pieces.reduce((sum, d) => sum + d.content.length, 0);
    if (size <= WHOLE_ARTICLE_CHARS) {
      const parts = [...new Set(pieces.map((d) => d.part).filter(Boolean))].slice(0, 8);
      items.push({
        id: `d${++n}`,
        label: `${first.category} › ${first.article_title}${parts.length ? ` [${parts.join(", ")}]` : ""}${dated(first)}`,
        docs: pieces,
      });
    } else {
      for (const d of pieces) {
        items.push({
          id: `d${++n}`,
          label: `${d.category} › ${d.article_title}${d.part ? ` › ${d.part}` : ""}${dated(d)}`,
          docs: [d],
        });
      }
    }
  }
  return items;
}

const ROUTER_SCHEMA = {
  type: "object",
  properties: {
    ids: {
      type: "array",
      items: { type: "string" },
      description: "Хамааралтай зүйлсийн id, ач холбогдлын дарааллаар (хамгийн ихдээ 6).",
    },
  },
  required: ["ids"],
};

function routerPrompt(items: RoutingItem[]): string {
  return `Чи ДДэш ТВ-ийн дотоод мэдлэгийн сангаас хайлт хийдэг туслах. Ажилтны СҮҮЛИЙН асуултад хариулахад хэрэгтэй зүйлсийг доорх жагсаалтаас сонго.
- Ажилтнууд латин үсгээр, товчилж бичдэг: nagra = Награ, arion = Арион, intek = Интек, konka = Конка, sungalt = сунгалт, bagts = багц, uramshuulal = урамшуулал, kino = кино, gomdol = гомдол, kart = карт, salbar = салбар г.м.
- Хамгийн хамааралтай 1–${MAX_PICKS} зүйлийн id-г ач холбогдлын дарааллаар өг. Төхөөрөмж дурдсан бол тухайн төхөөрөмжийн хэсгийг сонго.
- Хаалтанд CKB-д шинэчлэгдсэн огноо байна. Үнэ, урамшуулал, нөхцөлийн асуултад ижил сэдвийн хэд хэдэн зүйл байвал хамгийн сүүлд шинэчлэгдсэнийг заавал оруул.
- Ярианы өмнөх мессежийг харгалзаж, "тэр", "үүнийг" гэх мэт үгийг ойлго.
- Мэндчилгээ, хамааралгүй яриа, эсвэл тохирох зүйл байхгүй бол хоосон жагсаалт өг.

<index>
${items.map((it) => `${it.id}: ${it.label}`).join("\n")}
</index>`;
}

export interface SelectedContext {
  /** Knowledge sections whose full text goes into the prompt. */
  sections: KnowledgeSection[];
  docs: CkbDoc[];
}

/**
 * Small and "all devices" sections always go in, plus the device the staff
 * member named (decided in code — reliable), plus whatever the router picks.
 */
export async function selectContext(
  knowledge: KnowledgeSection[],
  recent: Content[],
  userTexts: string[]
): Promise<SelectedContext> {
  const always = knowledge.filter((s) => /бүх/i.test(s.title) || s.content.length <= ALWAYS_INCLUDE_CHARS);
  const chosen = new Set<KnowledgeSection>(always);
  const device = findMentionedDevice(knowledge, userTexts);
  if (device) chosen.add(device);

  const routable = knowledge.filter((s) => !chosen.has(s));
  const docs = await getCkbDocs();
  const items = buildItems(routable, docs);
  const pickedDocs: CkbDoc[] = [];

  // The last few turns give the router context ("тэр", "үүнийг"); they must open with a user turn.
  const tail = recent.slice(-4);
  while (tail.length > 1 && tail[0].role !== "user") tail.shift();

  if (items.length > 0) {
    const result = await generateGeminiJson<{ ids?: unknown }>(
      routerPrompt(items),
      tail,
      ROUTER_SCHEMA,
      { thinkingLevel: ThinkingLevel.MINIMAL, maxOutputTokens: 256 }
    );
    if ("error" in result) {
      // Answer anyway from the always-included sections rather than failing the question.
      console.warn("Knowledge routing failed; answering without CKB picks.");
    } else {
      const ids = Array.isArray(result.data.ids) ? result.data.ids.filter((x): x is string => typeof x === "string") : [];
      const byId = new Map(items.map((it) => [it.id, it]));
      let docChars = 0;
      for (const id of ids.slice(0, MAX_PICKS)) {
        const item = byId.get(id.trim());
        if (!item) continue;
        if (item.section) chosen.add(item.section);
        for (const d of item.docs) {
          if (docChars + d.content.length > MAX_DOC_CHARS && pickedDocs.length > 0) break;
          pickedDocs.push(d);
          docChars += d.content.length;
        }
      }
    }
  }

  // Keep the admin's section order.
  return { sections: knowledge.filter((s) => chosen.has(s)), docs: pickedDocs };
}
