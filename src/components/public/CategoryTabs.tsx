"use client";

import { LayoutGrid, Star } from "lucide-react";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

interface CategoryTabsProps {
  categories: Category[];
  activeId: string | null;
  favView: boolean;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onSelectFavorites: () => void;
  counts: Record<string, number>;
  totalCount: number;
  favCount: number;
}

export default function CategoryTabs({
  categories,
  activeId,
  favView,
  onSelect,
  onSelectAll,
  onSelectFavorites,
  counts,
  totalCount,
  favCount,
}: CategoryTabsProps) {
  return (
    <div className="no-scrollbar sticky top-15.5 z-20 flex gap-2 overflow-x-auto border-b border-divider bg-background/95 px-4 py-2.5 backdrop-blur-md lg:hidden">
      <Tab
        icon={LayoutGrid}
        label="Бүх мэдээлэл"
        count={totalCount}
        active={!favView && activeId === null}
        onClick={onSelectAll}
      />
      {categories.map((cat) => {
        const Icon = getCategoryIcon(cat.icon);
        return (
          <Tab
            key={cat.id}
            icon={Icon}
            label={cat.name}
            count={counts[cat.id] ?? 0}
            active={!favView && activeId === cat.id}
            onClick={() => onSelect(cat.id)}
          />
        );
      })}
      <Tab icon={Star} label="Хадгалсан" count={favCount} active={favView} onClick={onSelectFavorites} />
    </div>
  );
}

function Tab({
  icon: Icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: typeof LayoutGrid;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.75 text-[13.5px] font-medium transition-colors",
        active
          ? "border-transparent bg-accent-200 text-accent-900"
          : "border-neutral-300 bg-surface text-foreground"
      )}
    >
      <Icon size={14} />
      {label}
      <span className="text-neutral-600">{count}</span>
    </button>
  );
}
