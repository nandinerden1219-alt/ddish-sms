"use client";

import { LayoutGrid, Link2, Megaphone, type LucideIcon } from "lucide-react";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { cn } from "@/lib/utils";
import { isSameView, type View } from "@/lib/views";
import type { Category, CategoryGroup } from "@/types";

interface CategoryTabsProps {
  groups: CategoryGroup[];
  categories: Category[];
  view: View;
  onChange: (view: View) => void;
  counts: Record<string, number>;
  totalCount: number;
  postCount: number;
  linkCount: number;
}

/**
 * Mobile navigation. Row 1: sections + groups. Row 2 (only while a group or
 * one of its categories is selected): that group's categories.
 */
export default function CategoryTabs({
  groups,
  categories,
  view,
  onChange,
  counts,
  totalCount,
  postCount,
  linkCount,
}: CategoryTabsProps) {
  const groupIds = new Set(groups.map((g) => g.id));
  const ungrouped = categories.filter((c) => !c.group_id || !groupIds.has(c.group_id));

  const activeGroupId =
    view.kind === "group"
      ? view.id
      : view.kind === "category"
        ? (categories.find((c) => c.id === view.id)?.group_id ?? null)
        : null;
  const subCategories = activeGroupId ? categories.filter((c) => c.group_id === activeGroupId) : [];

  return (
    <div className="sticky top-15.5 z-20 border-b border-divider bg-background/95 backdrop-blur-md lg:hidden">
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2.5">
        <Tab icon={LayoutGrid} label="Бүгд" count={totalCount} active={view.kind === "all"} onClick={() => onChange({ kind: "all" })} />
        <Tab icon={Megaphone} label="Пост" count={postCount} active={view.kind === "posts"} onClick={() => onChange({ kind: "posts" })} />
        <Tab icon={Link2} label="Линк" count={linkCount} active={view.kind === "links"} onClick={() => onChange({ kind: "links" })} />
        {groups.map((g) => (
          <Tab
            key={g.id}
            icon={getCategoryIcon(g.icon)}
            label={g.name}
            count={categories.filter((c) => c.group_id === g.id).reduce((n, c) => n + (counts[c.id] ?? 0), 0)}
            active={activeGroupId === g.id}
            onClick={() => onChange({ kind: "group", id: g.id })}
          />
        ))}
        {ungrouped.map((cat) => (
          <Tab
            key={cat.id}
            icon={getCategoryIcon(cat.icon)}
            label={cat.name}
            count={counts[cat.id] ?? 0}
            active={isSameView(view, { kind: "category", id: cat.id })}
            onClick={() => onChange({ kind: "category", id: cat.id })}
          />
        ))}
      </div>

      {subCategories.length > 0 && (
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-2.5">
          {subCategories.map((cat) => {
            const active = isSameView(view, { kind: "category", id: cat.id });
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onChange({ kind: "category", id: cat.id })}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                  active ? "bg-accent-200 text-accent-900" : "bg-neutral-200/70 text-neutral-800"
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                {cat.name}
                <span className="opacity-55">{counts[cat.id] ?? 0}</span>
              </button>
            );
          })}
        </div>
      )}
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
  icon: LucideIcon;
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
