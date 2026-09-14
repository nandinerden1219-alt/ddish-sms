"use client";

import { LayoutGrid, Star } from "lucide-react";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

interface CategorySidebarProps {
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

export default function CategorySidebar({
  categories,
  activeId,
  favView,
  onSelect,
  onSelectAll,
  onSelectFavorites,
  counts,
  totalCount,
  favCount,
}: CategorySidebarProps) {
  return (
    <aside className="sticky top-23 hidden w-63.5 shrink-0 lg:block">
      <p className="mb-2.5 px-3.5 text-[11.5px] font-semibold tracking-[0.09em] text-neutral-600 uppercase">
        Ангилал
      </p>
      <nav className="flex flex-col gap-0.75">
        <NavButton
          icon={LayoutGrid}
          label="Бүх мэдээлэл"
          count={totalCount}
          active={!favView && activeId === null}
          onClick={onSelectAll}
        />
        {categories.map((cat) => {
          const Icon = getCategoryIcon(cat.icon);
          const active = !favView && activeId === cat.id;
          return (
            <NavButton
              key={cat.id}
              icon={Icon}
              label={cat.name}
              count={counts[cat.id] ?? 0}
              active={active}
              onClick={() => onSelect(cat.id)}
            />
          );
        })}
        <div className="mt-2">
          <NavButton
            icon={Star}
            label="Хадгалсан"
            count={favCount}
            active={favView}
            onClick={onSelectFavorites}
          />
        </div>
      </nav>
    </aside>
  );
}

function NavButton({
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
        "flex items-center gap-2.75 rounded-full px-3.5 py-2.5 text-left text-[14.5px] font-medium transition-colors",
        active ? "bg-accent-200 text-accent-900" : "text-foreground hover:bg-neutral-200"
      )}
    >
      <Icon size={17} className="shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      <span className="text-[12.5px] opacity-65">{count}</span>
    </button>
  );
}
