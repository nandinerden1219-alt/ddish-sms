"use client";

import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { filterItemsBySearch } from "@/lib/search";
import { createClient } from "@/lib/supabase/client";
import type { Category, InformationItem } from "@/types";
import ConfirmDialog from "./ConfirmDialog";
import InformationForm from "./InformationForm";
import InformationTable from "./InformationTable";

interface InformationManagerProps {
  initialItems: InformationItem[];
  categories: Category[];
}

export default function InformationManager({
  initialItems,
  categories,
}: InformationManagerProps) {
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InformationItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InformationItem | null>(null);

  const categoriesById = useMemo(() => {
    const map: Record<string, Category> = {};
    for (const c of categories) map[c.id] = c;
    return map;
  }, [categories]);

  async function refetch() {
    const supabase = createClient();
    const { data } = await supabase
      .from("information_items")
      .select("*")
      .order("display_order");
    if (data) setItems(data);
  }

  const filteredItems = useMemo(() => {
    let result = filterItemsBySearch(items, query, categoriesById);
    if (categoryFilter !== "all") {
      result = result.filter((i) => i.category_id === categoryFilter);
    }
    return result;
  }, [items, query, categoryFilter, categoriesById]);

  function handleAddNew() {
    setEditingItem(null);
    setFormOpen(true);
  }

  function handleEdit(item: InformationItem) {
    setEditingItem(item);
    setFormOpen(true);
  }

  async function handleDuplicate(item: InformationItem) {
    const supabase = createClient();
    const { error } = await supabase.from("information_items").insert({
      category_id: item.category_id,
      title: `${item.title} (хуулбар)`,
      message: item.message,
      additional_info: item.additional_info,
      keywords: item.keywords,
      display_order: item.display_order,
      is_popular: item.is_popular,
      is_active: item.is_active,
    });
    if (error) {
      toast.error("Хуулбарлахад алдаа гарлаа");
      return;
    }
    toast.success("Хуулбарлагдлаа");
    refetch();
  }

  async function patchItem(item: InformationItem, changes: Partial<InformationItem>, successMsg: string) {
    const supabase = createClient();
    const { error } = await supabase.from("information_items").update(changes).eq("id", item.id);
    if (error) {
      toast.error("Шинэчлэхэд алдаа гарлаа");
      return;
    }
    toast.success(successMsg);
    refetch();
  }

  function handleToggleActive(item: InformationItem) {
    void patchItem(
      item,
      { is_active: !item.is_active },
      item.is_active ? "Нүүр хуудаснаас нуулаа" : "Нүүр хуудсанд гаргалаа"
    );
  }

  function handleTogglePopular(item: InformationItem) {
    void patchItem(
      item,
      { is_popular: !item.is_popular },
      item.is_popular ? "Түгээмэлээс хаслаа" : "Түгээмэл болголоо"
    );
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("information_items")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) {
      toast.error("Устгахад алдаа гарлаа");
    } else {
      toast.success("Устгагдлаа");
      refetch();
    }
    setDeleteTarget(null);
  }

  return (
    <div>
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl">Мэдээллүүд</h1>
          <p className="mt-0.5 text-sm text-muted">
            Нийт {items.length} мэдээлэл · мөр бүр дээр Түгээмэл / Нийтэд товчоор шууд солино
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddNew}
          className="flex items-center justify-center gap-1.5 rounded-full bg-accent px-4.5 py-2.5 text-sm font-medium text-background hover:bg-accent-600"
        >
          <Plus size={16} /> Мэдээлэл нэмэх
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Хайх..."
            className="w-full rounded-full border border-border bg-background py-2 pr-3.5 pl-9.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-full border border-border bg-background px-3.5 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200"
        >
          <option value="all">Бүх ангилал</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <InformationTable
        items={filteredItems}
        categoriesById={categoriesById}
        onEdit={handleEdit}
        onDelete={setDeleteTarget}
        onDuplicate={handleDuplicate}
        onToggleActive={handleToggleActive}
        onTogglePopular={handleTogglePopular}
      />

      {formOpen && (
        <InformationForm
          onClose={() => setFormOpen(false)}
          onSaved={refetch}
          categories={categories}
          editingItem={editingItem}
          onDelete={
            editingItem
              ? () => {
                  setFormOpen(false);
                  setDeleteTarget(editingItem);
                }
              : undefined
          }
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Мэдээлэл устгах"
        description={`"${deleteTarget?.title}" мэдээллийг устгахдаа итгэлтэй байна уу? Энэ үйлдлийг буцаах боломжгүй.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
