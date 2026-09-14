"use client";

import { ChevronDown, LayoutGrid, Link2, Megaphone, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { cn } from "@/lib/utils";
import { isSameView, type View } from "@/lib/views";
import type { Category, CategoryGroup } from "@/types";

export interface NavTree {
  group: CategoryGroup | null; // null = ungrouped categories
  categories: Category[];
}

interface CategorySidebarProps {
  tree: NavTree[];
  view: View;
  onChange: (view: View) => void;
  counts: Record<string, number>; // per category id (search-filtered)
  totalCount: number;
  postCount: number;
  linkCount: number;
}

export default function CategorySidebar({
  tree,
  view,
  onChange,
  counts,
  totalCount,
  postCount,
  linkCount,
}: CategorySidebarProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function toggleGroup(key: string) {
    setCollapsed((c) => ({ ...c, [key]: !c[key] }));
  }

  return (
    <aside className="sticky top-23 hidden max-h-[calc(100vh-6.5rem)] w-64 shrink-0 overflow-y-auto pr-1 pb-4 lg:block">
      <nav className="flex flex-col gap-0.5">
        <TopButton
          icon={LayoutGrid}
          label="Бүх мэдээлэл"
          count={totalCount}
          active={view.kind === "all"}
          onClick={() => onChange({ kind: "all" })}
        />
        <TopButton
          icon={Megaphone}
          label="Пост"
          count={postCount}
          active={view.kind === "posts"}
          onClick={() => onChange({ kind: "posts" })}
        />
        <TopButton
          icon={Link2}
          label="Хэрэгтэй линк"
          count={linkCount}
          active={view.kind === "links"}
          onClick={() => onChange({ kind: "links" })}
        />
      </nav>

      <p className="mt-6 mb-2 px-3.5 text-[11px] font-semibold tracking-widest text-neutral-500 uppercase">
        Заавар
      </p>

      <div className="flex flex-col gap-1">
        {tree.map(({ group, categories }) => {
          const key = group?.id ?? "__ungrouped";
          const GroupIcon = group ? getCategoryIcon(group.icon) : LayoutGrid;
          const groupCount = categories.reduce((n, c) => n + (counts[c.id] ?? 0), 0);
          const groupView: View | null = group ? { kind: "group", id: group.id } : null;
          const groupActive = !!groupView && isSameView(view, groupView);
          const childActive = categories.some((c) => isSameView(view, { kind: "category", id: c.id }));
          const isCollapsed = !!collapsed[key] && !childActive;

          return (
            <div key={key}>
              <div
                className={cn(
                  "flex items-center rounded-full transition-colors",
                  groupActive ? "bg-accent-200 text-accent-900" : "text-foreground hover:bg-neutral-200/70"
                )}
              >
                <button
                  type="button"
                  onClick={() => (groupView ? onChange(groupView) : toggleGroup(key))}
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full py-2.25 pl-3.5 text-left text-[14px] font-semibold"
                >
                  <GroupIcon size={16} className="shrink-0" />
                  <span className="flex-1 truncate">{group?.name ?? "Бусад ангилал"}</span>
                  <span className="text-[12px] font-medium opacity-60">{groupCount}</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleGroup(key)}
                  aria-label={isCollapsed ? "Дэлгэх" : "Хумих"}
                  className="mr-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-neutral-300/60"
                >
                  <ChevronDown
                    size={15}
                    className={cn("transition-transform", isCollapsed && "-rotate-90")}
                  />
                </button>
              </div>

              {!isCollapsed && (
                <ul className="mt-0.5 mb-1 ml-5.5 border-l border-neutral-300 pl-2">
                  {categories.map((cat) => {
                    const active = isSameView(view, { kind: "category", id: cat.id });
                    return (
                      <li key={cat.id}>
                        <button
                          type="button"
                          onClick={() => onChange({ kind: "category", id: cat.id })}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-full py-1.5 pr-3 pl-2.5 text-left text-[13.5px] transition-colors",
                            active
                              ? "bg-accent-200 font-semibold text-accent-900"
                              : "text-neutral-800 hover:bg-neutral-200/70"
                          )}
                        >
                          <span
                            className="h-1.75 w-1.75 shrink-0 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="flex-1 truncate">{cat.name}</span>
                          <span className="text-[12px] opacity-55">{counts[cat.id] ?? 0}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 px-3.5 text-[11.5px] leading-6 text-neutral-500">
        <p>
          <Kbd>/</Kbd> хайлт · <Kbd>Enter</Kbd> эхнийг хуулах · <Kbd>Esc</Kbd> цэвэрлэх
        </p>
      </div>
    </aside>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-sm border border-neutral-300 bg-surface px-1.5 py-0.5 font-sans text-[10.5px] font-medium text-neutral-700">
      {children}
    </kbd>
  );
}

function TopButton({
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
        "flex items-center gap-2.5 rounded-full px-3.5 py-2.25 text-left text-[14px] font-medium transition-colors",
        active ? "bg-accent-200 text-accent-900" : "text-foreground hover:bg-neutral-200/70"
      )}
    >
      <Icon size={16} className="shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      <span className="text-[12px] opacity-60">{count}</span>
    </button>
  );
}
