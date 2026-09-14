"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";
import CategoryForm from "./CategoryForm";
import ConfirmDialog from "./ConfirmDialog";

interface CategoryManagerProps {
  initialCategories: Category[];
}

export default function CategoryManager({ initialCategories }: CategoryManagerProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const sorted = useMemo(
    () => [...categories].sort((a, b) => a.display_order - b.display_order),
    [categories]
  );

  async function refetch() {
    const supabase = createClient();
    const { data } = await supabase.from("categories").select("*").order("display_order");
    if (data) setCategories(data);
  }

  async function handleToggleActive(category: Category) {
    const supabase = createClient();
    const { error } = await supabase
      .from("categories")
      .update({ is_active: !category.is_active })
      .eq("id", category.id);
    if (error) {
      toast.error("Шинэчлэхэд алдаа гарлаа");
      return;
    }
    refetch();
  }

  async function handleMove(category: Category, direction: "up" | "down") {
    const idx = sorted.findIndex((c) => c.id === category.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];

    const supabase = createClient();
    await Promise.all([
      supabase
        .from("categories")
        .update({ display_order: other.display_order })
        .eq("id", category.id),
      supabase
        .from("categories")
        .update({ display_order: category.display_order })
        .eq("id", other.id),
    ]);
    refetch();
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    const supabase = createClient();
    const { error } = await supabase.from("categories").delete().eq("id", deleteTarget.id);
    if (error) {
      toast.error("Устгахад алдаа гарлаа");
    } else {
      toast.success("Ангилал устгагдлаа");
      refetch();
    }
    setDeleteTarget(null);
  }

  return (
    <div>
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold">Ангилал</h1>
          <p className="mt-0.5 text-sm text-muted">Нийт {categories.length} ангилал</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingCategory(null);
            setFormOpen(true);
          }}
          className="flex items-center justify-center gap-1.5 rounded-full bg-accent px-4.5 py-2.5 text-sm font-medium text-background hover:bg-accent-600"
        >
          <Plus size={16} /> Ангилал нэмэх
        </button>
      </div>

      <div className="space-y-2">
        {sorted.map((category, i) => {
          const Icon = getCategoryIcon(category.icon);
          return (
            <div
              key={category.id}
              className="flex items-center gap-3 rounded-md border border-border bg-surface p-3"
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => handleMove(category, "up")}
                  disabled={i === 0}
                  className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30"
                  aria-label="Дээш"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(category, "down")}
                  disabled={i === sorted.length - 1}
                  className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30"
                  aria-label="Доош"
                >
                  <ArrowDown size={14} />
                </button>
              </div>
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${category.color}1a`, color: category.color }}
              >
                <Icon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{category.name}</p>
                <p className="truncate text-xs text-muted">/{category.slug}</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleActive(category)}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  category.is_active
                    ? "bg-green-100 text-green-700"
                    : "bg-neutral-100 text-neutral-500"
                )}
              >
                {category.is_active ? "Идэвхтэй" : "Идэвхгүй"}
              </button>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(category);
                    setFormOpen(true);
                  }}
                  className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-200 hover:text-foreground"
                  aria-label="Засах"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(category)}
                  className="rounded-full p-1.5 text-neutral-500 hover:bg-accent-100 hover:text-accent-700"
                  aria-label="Устгах"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {formOpen && (
        <CategoryForm
          onClose={() => setFormOpen(false)}
          onSaved={refetch}
          editingCategory={editingCategory}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Ангилал устгах"
        description={`"${deleteTarget?.name}" ангиллыг устгахдаа итгэлтэй байна уу? Энэ ангилалд хамаарах мэдээллүүд "ангилалгүй" болно.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
