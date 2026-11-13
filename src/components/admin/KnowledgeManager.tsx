"use client";

import { ArrowDown, ArrowUp, BookOpen, FileText, Library, Network, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { AssistantKnowledge, CkbDoc } from "@/types";
import ConfirmDialog from "./ConfirmDialog";
import KnowledgeForm from "./KnowledgeForm";
import KnowledgeTeachChat from "./KnowledgeTeachChat";
import { KnowledgeDocView, KnowledgeSchemaView } from "./KnowledgeViews";

/** Above this, every question carries a lot of text: slower answers, free-tier limits. */
const LARGE_KNOWLEDGE_CHARS = 150_000;

type View = "doc" | "schema" | "manage" | "ckb";

const VIEWS: { id: View; label: string; icon: typeof FileText }[] = [
  { id: "doc", label: "Текст", icon: FileText },
  { id: "schema", label: "Схем", icon: Network },
  { id: "manage", label: "Засах", icon: Pencil },
  { id: "ckb", label: "CKB", icon: Library },
];

interface KnowledgeManagerProps {
  initialSections: AssistantKnowledge[];
  missingTable: boolean;
  /** Imported DDish CKB pieces (read-only here); [] when not imported. */
  ckbDocs: CkbDoc[];
}

/** One read-only card per CKB article, its parts (devices/sub-topics) as headings. */
function ckbToArticles(docs: CkbDoc[]): AssistantKnowledge[] {
  const byArticle = new Map<string, CkbDoc[]>();
  for (const d of docs) {
    if (!byArticle.has(d.short_id)) byArticle.set(d.short_id, []);
    byArticle.get(d.short_id)!.push(d);
  }
  return [...byArticle.values()].map((pieces, i) => {
    const first = pieces[0];
    const body = pieces.map((d) => (d.part ? `${d.part}:\n${d.content}` : d.content)).join("\n\n");
    const updated = first.source_updated_at ? ` · CKB-д шинэчилсэн: ${first.source_updated_at.slice(0, 10)}` : "";
    return {
      id: `ckb-${first.short_id}`,
      title: first.article_title,
      content: `Ангилал: ${first.category}${updated}\n\n${body}${first.url ? `\n\nCKB: ${first.url}` : ""}`,
      display_order: i,
      is_active: true,
      created_at: "",
      updated_at: "",
    };
  });
}

export default function KnowledgeManager({ initialSections, missingTable, ckbDocs }: KnowledgeManagerProps) {
  const ckbArticles = useMemo(() => ckbToArticles(ckbDocs), [ckbDocs]);
  const [sections, setSections] = useState(initialSections);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AssistantKnowledge | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssistantKnowledge | null>(null);
  const [view, setView] = useState<View>("doc");

  const sorted = useMemo(() => [...sections].sort((a, b) => a.display_order - b.display_order), [sections]);
  const activeChars = useMemo(
    () => sections.filter((s) => s.is_active).reduce((n, s) => n + s.title.length + s.content.length, 0),
    [sections]
  );

  async function refetch() {
    const supabase = createClient();
    const { data } = await supabase.from("assistant_knowledge").select("*").order("display_order");
    if (data) setSections(data);
  }

  async function toggleActive(section: AssistantKnowledge) {
    const supabase = createClient();
    const { error } = await supabase
      .from("assistant_knowledge")
      .update({ is_active: !section.is_active })
      .eq("id", section.id);
    if (error) {
      toast.error("Шинэчлэхэд алдаа гарлаа");
      return;
    }
    refetch();
  }

  async function move(section: AssistantKnowledge, direction: "up" | "down") {
    const idx = sorted.findIndex((s) => s.id === section.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    const a = section.display_order;
    const b = other.display_order === a ? a + (direction === "up" ? -1 : 1) : other.display_order;
    const supabase = createClient();
    await Promise.all([
      supabase.from("assistant_knowledge").update({ display_order: b }).eq("id", section.id),
      supabase.from("assistant_knowledge").update({ display_order: a }).eq("id", other.id),
    ]);
    refetch();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const supabase = createClient();
    const { error } = await supabase.from("assistant_knowledge").delete().eq("id", deleteTarget.id);
    if (error) toast.error("Устгахад алдаа гарлаа");
    else {
      toast.success("Мэдлэг устгагдлаа");
      refetch();
    }
    setDeleteTarget(null);
  }

  if (missingTable) {
    return (
      <div>
        <h1 className="text-xl">Nandia AI — мэдлэг</h1>
        <div className="mt-5 max-w-2xl rounded-lg border border-accent-300 bg-accent-100 p-5 text-sm leading-relaxed text-accent-900">
          <p className="font-semibold">Мэдлэгийн хүснэгт хараахан үүсээгүй байна.</p>
          <p className="mt-1.5">
            Supabase → SQL Editor дээр{" "}
            <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[12.5px]">
              supabase-migrations/2026-11-12-assistant-knowledge.sql
            </code>{" "}
            файлын агуулгыг хуулж ажиллуулаад энэ хуудсыг дахин ачаална уу.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-w-0">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-xl">Nandia AI — мэдлэг</h1>
            <p className="mt-0.5 text-sm text-muted">
              Идэвхтэй мэдлэгийг AI асуулт бүрт уншина · {sections.length} хэсэг ·{" "}
              {activeChars.toLocaleString("en-US")} тэмдэгт · өөрчлөлт 1 минутын дотор AI-д орно
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 rounded-full bg-accent px-4.5 py-2.5 text-sm font-medium text-background hover:bg-accent-600"
          >
            <Plus size={16} /> Мэдлэг нэмэх
          </button>
        </div>

        {activeChars > LARGE_KNOWLEDGE_CHARS && (
          <p className="mb-4 rounded-md bg-accent-100 px-4 py-2.5 text-sm text-accent-800">
            Мэдлэг их том болсон байна. Асуулт бүрт бүх мэдлэгийг илгээдэг тул хариулт удааширч, Gemini-ийн үнэгүй
            хязгаарт хурдан хүрч болзошгүй. Давхардсан эсвэл хуучирсан хэсгүүдийг хаах/устгахыг бодоорой.
          </p>
        )}

        <div className="mb-4 inline-flex rounded-full border border-neutral-300 bg-surface p-1" role="tablist">
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                view === id ? "bg-accent text-background" : "text-neutral-600 hover:bg-neutral-200"
              )}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {view === "ckb" ? (
          ckbArticles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center text-sm text-muted">
              CKB-ийн мэдээлэл хараахан импортлогдоогүй байна.
            </div>
          ) : (
            <KnowledgeDocView
              sections={ckbArticles}
              showToc={false}
              searchPlaceholder="CKB-ээс хайх… (жишээ нь урамшуулал, сунгалт, Награ)"
            />
          )
        ) : sorted.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center text-sm text-muted">
            Одоогоор мэдлэг алга. Төхөөрөмж бүрээр (Награ, 4K, 3.0…) эсвэл сэдвээр (дохио, антен, reset…) нэг нэг хэсэг
            болгон нэмнэ үү.
          </div>
        ) : view === "doc" ? (
          <KnowledgeDocView
            sections={sorted}
            onEdit={(section) => {
              setEditing(section);
              setFormOpen(true);
            }}
          />
        ) : view === "schema" ? (
          <KnowledgeSchemaView sections={sorted} />
        ) : (
          <ul className="space-y-2">
            {sorted.map((section, i) => (
              <li key={section.id} className="flex items-start gap-3 rounded-md border border-neutral-300 bg-surface p-3">
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => move(section, "up")}
                    disabled={i === 0}
                    className="rounded p-0.5 text-neutral-400 hover:bg-neutral-200 disabled:opacity-30"
                    aria-label="Дээш"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(section, "down")}
                    disabled={i === sorted.length - 1}
                    className="rounded p-0.5 text-neutral-400 hover:bg-neutral-200 disabled:opacity-30"
                    aria-label="Доош"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700">
                  <BookOpen size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{section.title}</p>
                  <p className="line-clamp-2 whitespace-pre-line text-xs text-neutral-600">{section.content}</p>
                  <p className="mt-0.5 text-[11px] text-neutral-500">
                    {section.content.length.toLocaleString("en-US")} тэмдэгт
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleActive(section)}
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    section.is_active ? "bg-accent-2-200 text-accent-2-800" : "bg-neutral-200 text-neutral-600"
                  )}
                  title={section.is_active ? "AI ашиглаж байна — дарж хаах" : "AI ашиглахгүй — дарж идэвхжүүлэх"}
                >
                  {section.is_active ? "Идэвхтэй" : "Хаалттай"}
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(section);
                      setFormOpen(true);
                    }}
                    className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-200 hover:text-foreground"
                    aria-label="Засах"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(section)}
                    className="rounded-full p-1.5 text-neutral-500 hover:bg-accent-100 hover:text-accent-700"
                    aria-label="Устгах"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="xl:sticky xl:top-6">
        <KnowledgeTeachChat onChanged={refetch} />
      </div>

      {formOpen && (
        <KnowledgeForm
          onClose={() => setFormOpen(false)}
          onSaved={refetch}
          editing={editing}
          nextOrder={(sorted.at(-1)?.display_order ?? 0) + 1}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Мэдлэг устгах"
        description={`"${deleteTarget?.title}" хэсгийг устгах уу?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
