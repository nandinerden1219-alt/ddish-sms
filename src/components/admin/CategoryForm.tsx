"use client";

import { Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CATEGORY_COLOR_PRESETS, CATEGORY_ICON_NAMES, CATEGORY_ICONS } from "@/lib/categoryIcons";
import { createClient } from "@/lib/supabase/client";
import { cn, slugify } from "@/lib/utils";
import type { Category, CategoryFormValues } from "@/types";
import Modal from "./Modal";

interface CategoryFormProps {
  onClose: () => void;
  onSaved: () => void;
  editingCategory: Category | null;
}

function emptyValues(): CategoryFormValues {
  return {
    name: "",
    slug: "",
    color: CATEGORY_COLOR_PRESETS[0],
    icon: CATEGORY_ICON_NAMES[0],
    display_order: 0,
    is_active: true,
  };
}

function initialValues(editingCategory: Category | null): CategoryFormValues {
  if (!editingCategory) return emptyValues();
  return {
    name: editingCategory.name,
    slug: editingCategory.slug,
    color: editingCategory.color,
    icon: editingCategory.icon,
    display_order: editingCategory.display_order,
    is_active: editingCategory.is_active,
  };
}

export default function CategoryForm({
  onClose,
  onSaved,
  editingCategory,
}: CategoryFormProps) {
  const [values, setValues] = useState<CategoryFormValues>(() => initialValues(editingCategory));
  const [slugEdited, setSlugEdited] = useState(() => !!editingCategory);
  const [saving, setSaving] = useState(false);

  function handleNameChange(name: string) {
    setValues((v) => ({ ...v, name, slug: slugEdited ? v.slug : slugify(name) }));
  }

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
      color: values.color,
      icon: values.icon,
      display_order: values.display_order,
      is_active: values.is_active,
    };

    const { error } = editingCategory
      ? await supabase.from("categories").update(payload).eq("id", editingCategory.id)
      : await supabase.from("categories").insert(payload);

    setSaving(false);

    if (error) {
      toast.error(
        error.code === "23505" ? "Энэ slug бүхий ангилал бүртгэлтэй байна" : "Хадгалахад алдаа гарлаа"
      );
      return;
    }

    toast.success("Ангилал хадгалагдлаа");
    onSaved();
    onClose();
  }

  const PreviewIcon = CATEGORY_ICONS[values.icon] ?? Info;

  return (
    <Modal
      open
      onClose={onClose}
      title={editingCategory ? "Ангилал засах" : "Ангилал нэмэх"}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 rounded-md border border-border bg-background p-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: `${values.color}29`, color: values.color }}
          >
            <PreviewIcon size={18} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{values.name || "Ангиллын нэр"}</p>
            <p className="truncate text-xs text-muted">/{values.slug || "slug"}</p>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Нэр *</label>
          <input
            value={values.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200"
            placeholder="Сунгалттай холбоотой"
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
            className="w-full rounded-full border border-border bg-background px-4 py-2 font-mono text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200"
            placeholder="sungalt"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Өнгө</label>
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORY_COLOR_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setValues((v) => ({ ...v, color }))}
                className={cn(
                  "h-7 w-7 rounded-full ring-offset-2 transition-shadow",
                  values.color === color && "ring-2 ring-neutral-900"
                )}
                style={{ backgroundColor: color }}
                aria-label={color}
              />
            ))}
            <input
              type="color"
              value={values.color}
              onChange={(e) => setValues((v) => ({ ...v, color: e.target.value }))}
              className="h-7 w-9 cursor-pointer rounded-full border border-border"
              aria-label="Өөрийн өнгө сонгох"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Икон</label>
          <div className="grid grid-cols-8 gap-1.5 rounded-md border border-border p-2 sm:grid-cols-11">
            {CATEGORY_ICON_NAMES.map((iconName) => {
              const IconComp = CATEGORY_ICONS[iconName] ?? Info;
              const active = values.icon === iconName;
              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, icon: iconName }))}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                    active ? "bg-neutral-900 text-background" : "text-neutral-500 hover:bg-neutral-100"
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
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Дараалал
            </label>
            <input
              type="number"
              value={values.display_order}
              onChange={(e) =>
                setValues((v) => ({ ...v, display_order: Number(e.target.value) }))
              }
              className="w-full rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200"
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
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-background hover:bg-accent-600 disabled:opacity-60"
          >
            {saving ? "Хадгалж байна..." : "Хадгалах"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
