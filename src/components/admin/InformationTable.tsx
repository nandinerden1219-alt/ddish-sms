"use client";

import { Copy, Pencil, Star, Trash2 } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { Category, InformationItem } from "@/types";

interface InformationTableProps {
  items: InformationItem[];
  categoriesById: Record<string, Category>;
  onEdit: (item: InformationItem) => void;
  onDelete: (item: InformationItem) => void;
  onDuplicate: (item: InformationItem) => void;
  onToggleActive: (item: InformationItem) => void;
  onTogglePopular: (item: InformationItem) => void;
}

/** Admin list of information items. A responsive row list (not a wide table)
 *  so the actions are always visible without horizontal scrolling. */
export default function InformationTable({
  items,
  categoriesById,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleActive,
  onTogglePopular,
}: InformationTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface py-16 text-center text-sm text-muted">
        Мэдээлэл олдсонгүй
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item, i) => {
        const category = item.category_id ? categoriesById[item.category_id] : undefined;
        const tint = category?.color ?? "#a19786";
        return (
          <li
            key={item.id}
            className={cn(
              "rounded-md border border-neutral-300 bg-surface p-3.5 sm:p-4",
              !item.is_active && "opacity-70"
            )}
            style={{ borderLeft: `4px solid ${tint}` }}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium text-neutral-500">#{i + 1}</span>
                  {category && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10.5px] font-bold tracking-[0.06em] uppercase"
                      style={{ backgroundColor: `${tint}29`, color: tint }}
                    >
                      {category.name}
                    </span>
                  )}
                  {item.additional_info && (
                    <span className="rounded-full bg-accent-2-200 px-2 py-0.5 text-[10.5px] font-semibold text-accent-2-800">
                      + нэмэлт
                    </span>
                  )}
                  <span className="ml-auto text-[11.5px] text-neutral-500">
                    {formatDate(item.updated_at)} · дараалал {item.display_order}
                  </span>
                </div>
                <h3 className="text-[15px] leading-snug">{item.title}</h3>
                <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed whitespace-pre-line text-neutral-700">
                  {item.message}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 lg:w-90 lg:shrink-0 lg:justify-end">
                <button
                  type="button"
                  onClick={() => onTogglePopular(item)}
                  title={item.is_popular ? "Түгээмэлээс хасах" : "Түгээмэл болгох"}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors",
                    item.is_popular
                      ? "border-accent-300 bg-accent-100 text-accent-800"
                      : "border-neutral-300 text-neutral-600 hover:bg-neutral-200"
                  )}
                >
                  <Star size={12} fill={item.is_popular ? "currentColor" : "none"} />
                  Түгээмэл
                </button>
                <button
                  type="button"
                  onClick={() => onToggleActive(item)}
                  title={item.is_active ? "Нүүр хуудаснаас нуух" : "Нүүр хуудсанд гаргах"}
                  className={cn(
                    "rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors",
                    item.is_active
                      ? "bg-accent-2-200 text-accent-2-800 hover:bg-accent-2-300"
                      : "bg-neutral-300 text-neutral-800 hover:bg-neutral-400/70"
                  )}
                >
                  {item.is_active ? "Нийтэд" : "Хаалттай"}
                </button>

                <span className="mx-0.5 hidden h-5 w-px bg-neutral-300 lg:block" />

                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="inline-flex items-center gap-1 rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-200"
                >
                  <Pencil size={12} /> Засах
                </button>
                <button
                  type="button"
                  onClick={() => onDuplicate(item)}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium text-accent hover:bg-accent-100"
                >
                  <Copy size={12} /> Хувилах
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  className="inline-flex items-center gap-1 rounded-full border border-accent-300 px-3 py-1.5 text-xs font-semibold text-accent-800 hover:bg-accent-200"
                >
                  <Trash2 size={12} /> Устгах
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
