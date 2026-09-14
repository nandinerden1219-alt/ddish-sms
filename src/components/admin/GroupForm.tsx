"use client";

import { Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CATEGORY_ICON_NAMES, CATEGORY_ICONS } from "@/lib/categoryIcons";
import { createClient } from "@/lib/supabase/client";
import { cn, slugify } from "@/lib/utils";
import type { CategoryGroup, CategoryGroupFormValues } from "@/types";
import Modal from "./Modal";

interface GroupFormProps {
  onClose: () => void;
  onSaved: () => void;
  editing: CategoryGroup | null;
  nextOrder: number;
}

function initialValues(editing: CategoryGroup | null, nextOrder: number): CategoryGroupFormValues {
  if (!editing) return { name: "", slug: "", icon: "Folder", display_order: nextOrder, is_active: true };
  return {
    name: editing.name,
    slug: editing.slug,
    icon: editing.icon,
    display_order: editing.display_order,
    is_active: editing.is_active,
  };
}

const inputClass =
  "w-full rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200";

export default function GroupForm({ onClose, onSaved, editing, nextOrder }: GroupFormProps) {
  const [values, setValues] = useState(() => initialValues(editing, nextOrder));
  const [slugEdited, setSlugEdited] = useState(() => !!editing);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.name.trim() || !values.slug.trim()) {
      toast.error("Нэр болон slug-ийг бөглөнө үү");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      name: values.name.trim(),
      slug: values.slug.trim(),
      icon: values.icon,
      display_order: values.display_order,
      is_active: values.is_active,
    };
    const { error } = editing
      ? await supabase.from("category_groups").update(payload).eq("id", editing.id)
      : await supabase.from("category_groups").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.code === "23505" ? "Энэ slug бүхий бүлэг бүртгэлтэй байна" : "Хадгалахад алдаа гарлаа");
      return;
    }
    toast.success("Бүлэг хадгалагдлаа");
    onSaved();
    onClose();
  }

  const PreviewIcon = CATEGORY_ICONS[values.icon] ?? Info;

  return (
    <Modal open onClose={onClose} title={editing ? "Бүлэг засах" : "Бүлэг нэмэх"} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 rounded-md border border-border bg-background p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-200 text-accent-900">
            <PreviewIcon size={18} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{values.name || "Бүлгийн нэр"}</p>
            <p className="truncate text-xs text-muted">Хажуугийн цэсний дээд түвшний хэсэг</p>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Нэр *</label>
          <input
            value={values.name}
            onChange={(e) =>
              setValues((v) => ({ ...v, name: e.target.value, slug: slugEdited ? v.slug : slugify(e.target.value) }))
            }
            className={inputClass}
            placeholder="Жишээ: SMS заавар"
            autoFocus
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Slug *</label>
          <input
            value={values.slug}
            onChange={(e) => {
              setSlugEdited(true);
              setValues((v) => ({ ...v, slug: e.target.value }));
            }}
            className={cn(inputClass, "font-mono")}
            placeholder="sms-zaavar"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Икон</label>
          <div className="grid grid-cols-8 gap-1.5 rounded-md border border-border p-2 sm:grid-cols-10">
            {CATEGORY_ICON_NAMES.map((iconName) => {
              const IconComp = CATEGORY_ICONS[iconName] ?? Info;
              const active = values.icon === iconName;
              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, icon: iconName }))}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                    active ? "bg-neutral-900 text-background" : "text-neutral-500 hover:bg-neutral-200"
                  )}
                  aria-label={iconName}
                >
                  <IconComp size={15} />
                </button>
              );
            })}
          </div>
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
              Идэвхтэй
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
