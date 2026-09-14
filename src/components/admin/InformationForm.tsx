"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Category, InformationFormValues, InformationItem } from "@/types";
import Modal from "./Modal";

interface InformationFormProps {
  onClose: () => void;
  onSaved: () => void;
  categories: Category[];
  editingItem: InformationItem | null;
  /** When editing: asks the parent to delete this item (parent confirms). */
  onDelete?: () => void;
}

function emptyValues(defaultCategoryId: string): InformationFormValues {
  return {
    category_id: defaultCategoryId,
    title: "",
    message: "",
    additional_info: "",
    keywords: "",
    display_order: 0,
    is_popular: false,
    is_active: true,
  };
}

function initialValues(
  editingItem: InformationItem | null,
  categories: Category[]
): InformationFormValues {
  if (!editingItem) return emptyValues(categories[0]?.id ?? "");
  return {
    category_id: editingItem.category_id ?? "",
    title: editingItem.title,
    message: editingItem.message,
    additional_info: editingItem.additional_info ?? "",
    keywords: editingItem.keywords ?? "",
    display_order: editingItem.display_order,
    is_popular: editingItem.is_popular,
    is_active: editingItem.is_active,
  };
}

export default function InformationForm({
  onClose,
  onSaved,
  categories,
  editingItem,
  onDelete,
}: InformationFormProps) {
  const [values, setValues] = useState<InformationFormValues>(() =>
    initialValues(editingItem, categories)
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.title.trim() || !values.message.trim() || !values.category_id) {
      toast.error("Ангилал, гарчиг, мессежийг заавал бөглөнө үү");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const payload = {
      category_id: values.category_id,
      title: values.title.trim(),
      message: values.message,
      additional_info: values.additional_info.trim() ? values.additional_info : null,
      keywords: values.keywords.trim() || null,
      display_order: values.display_order,
      is_popular: values.is_popular,
      is_active: values.is_active,
    };

    const { error } = editingItem
      ? await supabase.from("information_items").update(payload).eq("id", editingItem.id)
      : await supabase.from("information_items").insert(payload);

    setSaving(false);

    if (error) {
      toast.error("Хадгалахад алдаа гарлаа");
      return;
    }

    toast.success("Мэдээлэл хадгалагдлаа");
    onSaved();
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editingItem ? "Мэдээлэл засах" : "Мэдээлэл нэмэх"}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Ангилал *
            </label>
            <select
              value={values.category_id}
              onChange={(e) => setValues((v) => ({ ...v, category_id: e.target.value }))}
              className="w-full rounded-full border border-border bg-background px-3.5 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200"
            >
              <option value="" disabled>
                Сонгох...
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Дараалал
            </label>
            <input
              type="number"
              value={values.display_order}
              onChange={(e) =>
                setValues((v) => ({ ...v, display_order: Number(e.target.value) }))
              }
              className="w-full rounded-full border border-border bg-background px-3.5 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Гарчиг *</label>
          <input
            type="text"
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            className="w-full rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200"
            placeholder="Нэмэлт багц сунгалт"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Мессеж утга *</label>
          <textarea
            rows={5}
            value={values.message}
            onChange={(e) => setValues((v) => ({ ...v, message: e.target.value }))}
            className="w-full rounded-sm border border-border bg-background px-3.5 py-2.75 font-mono text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200"
            placeholder={"Khan dans - ...\nhuleen awagch - ..."}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Нэмэлт мэдээлэл
          </label>
          <textarea
            rows={4}
            value={values.additional_info}
            onChange={(e) => setValues((v) => ({ ...v, additional_info: e.target.value }))}
            className="w-full rounded-sm border border-border bg-background px-3.5 py-2.75 font-mono text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Түлхүүр үгс
          </label>
          <input
            type="text"
            value={values.keywords}
            onChange={(e) => setValues((v) => ({ ...v, keywords: e.target.value }))}
            className="w-full rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200"
            placeholder="khan bank, сунгалт, ..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <input
              type="checkbox"
              checked={values.is_popular}
              onChange={(e) => setValues((v) => ({ ...v, is_popular: e.target.checked }))}
              className="h-4 w-4 rounded border-border accent-accent"
            />
            Түгээмэл
          </label>
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

        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-border pt-4">
          {editingItem && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="mr-auto inline-flex min-h-11 items-center gap-1.5 rounded-full border border-accent-300 px-4 py-2.5 text-sm font-semibold text-accent-800 hover:bg-accent-200"
            >
              <Trash2 size={15} /> Устгах
            </button>
          )}
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
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-background hover:bg-accent-600 disabled:opacity-60"
          >
            {saving ? "Хадгалж байна..." : "Хадгалах"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
