"use client";

import { Star } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Category, InformationItem } from "@/types";

interface PopularManagerProps {
  initialItems: InformationItem[];
  categories: Category[];
}

export default function PopularManager({ initialItems, categories }: PopularManagerProps) {
  const [items, setItems] = useState(initialItems);

  const categoriesById = useMemo(() => {
    const map: Record<string, Category> = {};
    for (const c of categories) map[c.id] = c;
    return map;
  }, [categories]);

  const popularItems = items.filter((i) => i.is_popular);
  const otherItems = items.filter((i) => !i.is_popular);

  async function handleToggle(item: InformationItem) {
    const supabase = createClient();
    const { error } = await supabase
      .from("information_items")
      .update({ is_popular: !item.is_popular })
      .eq("id", item.id);
    if (error) {
      toast.error("Шинэчлэхэд алдаа гарлаа");
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_popular: !i.is_popular } : i))
    );
  }

  function Row({ item }: { item: InformationItem }) {
    const category = item.category_id ? categoriesById[item.category_id] : undefined;
    const Icon = getCategoryIcon(category?.icon);
    return (
      <div className="flex items-center gap-3 rounded-md border border-border bg-surface p-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{
            backgroundColor: `${category?.color ?? "#94a3b8"}1a`,
            color: category?.color ?? "#64748b",
          }}
        >
          <Icon size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.title}</p>
          <p className="truncate text-xs text-muted">{category?.name ?? "Ангилалгүй"}</p>
        </div>
        <button
          type="button"
          onClick={() => handleToggle(item)}
          className={cn(
            "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            item.is_popular
              ? "border-amber-300 bg-amber-50 text-amber-700"
              : "border-border text-neutral-500 hover:bg-neutral-50"
          )}
        >
          <Star size={13} fill={item.is_popular ? "currentColor" : "none"} />
          {item.is_popular ? "Түгээмэл" : "Түгээмэл болгох"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Түгээмэл мэдээлэл</h1>
      <p className="mt-0.5 text-sm text-muted">
        Нүүр хуудасны &quot;Түгээмэл мэдээлэл&quot; хэсэгт харагдах мэдээллийг сонгоно уу
      </p>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-neutral-500">
          Одоогийн түгээмэл ({popularItems.length})
        </h2>
        {popularItems.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">
            Одоогоор түгээмэл мэдээлэл сонгогдоогүй байна
          </p>
        ) : (
          <div className="space-y-2">
            {popularItems.map((item) => (
              <Row key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-neutral-500">Бусад мэдээлэл</h2>
        <div className="space-y-2">
          {otherItems.map((item) => (
            <Row key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
