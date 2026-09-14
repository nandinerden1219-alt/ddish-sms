"use client";

import { cn, formatDateTime } from "@/lib/utils";
import type { Category, InformationItem } from "@/types";

interface InformationTableProps {
  items: InformationItem[];
  categoriesById: Record<string, Category>;
  onEdit: (item: InformationItem) => void;
  onDelete: (item: InformationItem) => void;
  onDuplicate: (item: InformationItem) => void;
}

export default function InformationTable({
  items,
  categoriesById,
  onEdit,
  onDelete,
  onDuplicate,
}: InformationTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface py-16 text-center text-sm text-muted">
        Мэдээлэл олдсонгүй
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead className="border-b border-border bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-3 font-medium">№</th>
            <th className="px-4 py-3 font-medium">Ангилал</th>
            <th className="px-4 py-3 font-medium">Гарчиг</th>
            <th className="px-4 py-3 font-medium">Мессеж</th>
            <th className="px-4 py-3 font-medium">Нэмэлт</th>
            <th className="px-4 py-3 font-medium">Дараалал</th>
            <th className="px-4 py-3 font-medium">Түгээмэл</th>
            <th className="px-4 py-3 font-medium">Төлөв</th>
            <th className="px-4 py-3 font-medium">Шинэчлэгдсэн</th>
            <th className="px-4 py-3 text-right font-medium">Үйлдэл</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item, i) => {
            const category = item.category_id ? categoriesById[item.category_id] : undefined;
            return (
              <tr key={item.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3 text-neutral-400">{i + 1}</td>
                <td className="px-4 py-3">
                  {category && (
                    <span
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: `${category.color}1a`, color: category.color }}
                    >
                      {category.name}
                    </span>
                  )}
                </td>
                <td className="max-w-[180px] truncate px-4 py-3 font-medium">{item.title}</td>
                <td className="max-w-[240px] truncate px-4 py-3 text-neutral-500">
                  {item.message}
                </td>
                <td className="px-4 py-3 text-neutral-400">
                  {item.additional_info ? "Тийм" : "—"}
                </td>
                <td className="px-4 py-3 text-neutral-500">{item.display_order}</td>
                <td className="px-4 py-3">
                  {item.is_popular && (
                    <span className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Тийм
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
                      item.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-neutral-100 text-neutral-500"
                    )}
                  >
                    {item.is_active ? "Идэвхтэй" : "Идэвхгүй"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-neutral-500">
                  {formatDateTime(item.updated_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      title="Засах"
                      className="rounded-full border border-neutral-300 px-2.5 py-1.5 text-xs font-medium hover:bg-neutral-200"
                    >
                      Засах
                    </button>
                    <button
                      type="button"
                      onClick={() => onDuplicate(item)}
                      title="Хувилах"
                      className="rounded-full px-2.25 py-1.5 text-xs font-medium text-accent hover:bg-accent-100"
                    >
                      Хувилах
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item)}
                      title="Устгах"
                      className="rounded-full px-2.25 py-1.5 text-xs font-medium text-accent-700 hover:bg-accent-100"
                    >
                      Устгах
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
