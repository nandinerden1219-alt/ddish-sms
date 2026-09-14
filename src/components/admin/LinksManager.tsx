"use client";

import { ArrowDown, ArrowUp, ExternalLink, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { UsefulLink } from "@/types";
import ConfirmDialog from "./ConfirmDialog";
import LinkForm from "./LinkForm";

interface LinksManagerProps {
  initialLinks: UsefulLink[];
}

export default function LinksManager({ initialLinks }: LinksManagerProps) {
  const [links, setLinks] = useState(initialLinks);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UsefulLink | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UsefulLink | null>(null);

  const sorted = useMemo(() => [...links].sort((a, b) => a.display_order - b.display_order), [links]);

  async function refetch() {
    const supabase = createClient();
    const { data } = await supabase.from("useful_links").select("*").order("display_order");
    if (data) setLinks(data);
  }

  async function toggleActive(link: UsefulLink) {
    const supabase = createClient();
    const { error } = await supabase.from("useful_links").update({ is_active: !link.is_active }).eq("id", link.id);
    if (error) {
      toast.error("Шинэчлэхэд алдаа гарлаа");
      return;
    }
    refetch();
  }

  async function move(link: UsefulLink, direction: "up" | "down") {
    const idx = sorted.findIndex((l) => l.id === link.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    const a = link.display_order;
    const b = other.display_order === a ? a + (direction === "up" ? -1 : 1) : other.display_order;
    const supabase = createClient();
    await Promise.all([
      supabase.from("useful_links").update({ display_order: b }).eq("id", link.id),
      supabase.from("useful_links").update({ display_order: a }).eq("id", other.id),
    ]);
    refetch();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const supabase = createClient();
    const { error } = await supabase.from("useful_links").delete().eq("id", deleteTarget.id);
    if (error) toast.error("Устгахад алдаа гарлаа");
    else {
      toast.success("Линк устгагдлаа");
      refetch();
    }
    setDeleteTarget(null);
  }

  return (
    <div>
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl">Хэрэгтэй линк</h1>
          <p className="mt-0.5 text-sm text-muted">
            Нүүр хуудасны «Хэрэгтэй линк» хэсэгт харагдана · {links.length} линк
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
          <Plus size={16} /> Линк нэмэх
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface py-16 text-center text-sm text-muted">
          Одоогоор линк алга. Дотоод систем, банкны хуудас, сошиал суваг зэргийг нэмнэ үү.
        </div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((link, i) => (
            <li key={link.id} className="flex items-center gap-3 rounded-md border border-neutral-300 bg-surface p-3">
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => move(link, "up")}
                  disabled={i === 0}
                  className="rounded p-0.5 text-neutral-400 hover:bg-neutral-200 disabled:opacity-30"
                  aria-label="Дээш"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => move(link, "down")}
                  disabled={i === sorted.length - 1}
                  className="rounded p-0.5 text-neutral-400 hover:bg-neutral-200 disabled:opacity-30"
                  aria-label="Доош"
                >
                  <ArrowDown size={14} />
                </button>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700">
                <Link2 size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{link.title}</p>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-1 truncate font-mono text-xs text-neutral-600 hover:text-accent"
                >
                  {link.url} <ExternalLink size={11} className="shrink-0" />
                </a>
                {link.description && <p className="truncate text-xs text-muted">{link.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => toggleActive(link)}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  link.is_active ? "bg-accent-2-200 text-accent-2-800" : "bg-neutral-200 text-neutral-600"
                )}
              >
                {link.is_active ? "Нийтэд" : "Хаалттай"}
              </button>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(link);
                    setFormOpen(true);
                  }}
                  className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-200 hover:text-foreground"
                  aria-label="Засах"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(link)}
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

      {formOpen && (
        <LinkForm
          onClose={() => setFormOpen(false)}
          onSaved={refetch}
          editing={editing}
          nextOrder={(sorted.at(-1)?.display_order ?? 0) + 1}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Линк устгах"
        description={`"${deleteTarget?.title}" линкийг устгах уу?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
