"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { UsefulLink, UsefulLinkFormValues } from "@/types";
import Modal from "./Modal";

interface LinkFormProps {
  onClose: () => void;
  onSaved: () => void;
  editing: UsefulLink | null;
  nextOrder: number;
}

function initialValues(editing: UsefulLink | null, nextOrder: number): UsefulLinkFormValues {
  if (!editing) return { title: "", url: "", description: "", display_order: nextOrder, is_active: true };
  return {
    title: editing.title,
    url: editing.url,
    description: editing.description ?? "",
    display_order: editing.display_order,
    is_active: editing.is_active,
  };
}

function normalizeUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

const inputClass =
  "w-full rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200";

export default function LinkForm({ onClose, onSaved, editing, nextOrder }: LinkFormProps) {
  const [values, setValues] = useState(() => initialValues(editing, nextOrder));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = normalizeUrl(values.url);
    if (!values.title.trim()) {
      toast.error("Нэрийг бөглөнө үү");
      return;
    }
    if (!url) {
      toast.error("URL буруу байна (жишээ: https://ddishtv.mn)");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const payload = {
      title: values.title.trim(),
      url,
      description: values.description.trim() || null,
      display_order: values.display_order,
      is_active: values.is_active,
    };
    const { error } = editing
      ? await supabase.from("useful_links").update(payload).eq("id", editing.id)
      : await supabase.from("useful_links").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Хадгалахад алдаа гарлаа");
      return;
    }
    toast.success("Линк хадгалагдлаа");
    onSaved();
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={editing ? "Линк засах" : "Линк нэмэх"} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Нэр *</label>
          <input
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            className={inputClass}
            placeholder="Жишээ: Хаан банк — Интернэт банк"
            autoFocus
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">URL *</label>
          <input
            value={values.url}
            onChange={(e) => setValues((v) => ({ ...v, url: e.target.value }))}
            className={`${inputClass} font-mono`}
            placeholder="https://…"
            inputMode="url"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Тайлбар <span className="font-normal text-neutral-500">(заавал биш)</span>
          </label>
          <input
            value={values.description}
            onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
            className={inputClass}
            placeholder="Юунд хэрэглэдэг вэ?"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Дараалал</label>
            <input
              type="number"
              value={values.display_order}
              onChange={(e) => setValues((v) => ({ ...v, display_order: Number(e.target.value) }))}
              className={inputClass}
            />
          </div>
          <div className="flex items-end pb-2.5">
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
              <input
                type="checkbox"
                checked={values.is_active}
                onChange={(e) => setValues((v) => ({ ...v, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-border accent-accent"
              />
              Нийтэд харагдана
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full border border-border px-4.5 py-2.5 text-sm font-medium hover:bg-neutral-200"
          >
            Болих
          </button>
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-background hover:bg-accent-600 disabled:opacity-60"
          >
            {saving ? "Хадгалж байна..." : "Хадгалах"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
