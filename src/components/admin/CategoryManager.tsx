"use client";

import { ArrowDown, ArrowUp, FolderPlus, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Category, CategoryGroup } from "@/types";
import CategoryForm from "./CategoryForm";
import ConfirmDialog from "./ConfirmDialog";
import GroupForm from "./GroupForm";

interface CategoryManagerProps {
  initialCategories: Category[];
  initialGroups: CategoryGroup[];
}

export default function CategoryManager({ initialCategories, initialGroups }: CategoryManagerProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [groups, setGroups] = useState(initialGroups);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [defaultGroupId, setDefaultGroupId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CategoryGroup | null>(null);
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<CategoryGroup | null>(null);

  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.display_order - b.display_order),
    [groups]
  );

  const sections = useMemo(() => {
    const byGroup = new Map<string | null, Category[]>();
    for (const c of [...categories].sort((a, b) => a.display_order - b.display_order)) {
      const key = c.group_id && groups.some((g) => g.id === c.group_id) ? c.group_id : null;
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key)!.push(c);
    }
    const list: { group: CategoryGroup | null; categories: Category[] }[] = sortedGroups.map((g) => ({
      group: g,
      categories: byGroup.get(g.id) ?? [],
    }));
    const ungrouped = byGroup.get(null) ?? [];
    if (ungrouped.length > 0) list.push({ group: null, categories: ungrouped });
    return list;
  }, [categories, groups, sortedGroups]);

  async function refetch() {
    const supabase = createClient();
    const [{ data: cats }, { data: grps }] = await Promise.all([
      supabase.from("categories").select("*").order("display_order"),
      supabase.from("category_groups").select("*").order("display_order"),
    ]);
    if (cats) setCategories(cats);
    if (grps) setGroups(grps);
  }

  // ---- categories ----

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

  async function handleMove(category: Category, siblings: Category[], direction: "up" | "down") {
    const idx = siblings.findIndex((c) => c.id === category.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const other = siblings[swapIdx];
    // Ensure distinct orders even if two rows share the same value.
    const a = category.display_order;
    const b = other.display_order === a ? a + (direction === "up" ? -1 : 1) : other.display_order;
    const supabase = createClient();
    await Promise.all([
      supabase.from("categories").update({ display_order: b }).eq("id", category.id),
      supabase.from("categories").update({ display_order: a }).eq("id", other.id),
    ]);
    refetch();
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    const supabase = createClient();
    const { error } = await supabase.from("categories").delete().eq("id", deleteTarget.id);
    if (error) toast.error("Устгахад алдаа гарлаа");
    else {
      toast.success("Ангилал устгагдлаа");
      refetch();
    }
    setDeleteTarget(null);
  }

  // ---- groups ----

  async function handleMoveGroup(group: CategoryGroup, direction: "up" | "down") {
    const idx = sortedGroups.findIndex((g) => g.id === group.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sortedGroups.length) return;
    const other = sortedGroups[swapIdx];
    const a = group.display_order;
    const b = other.display_order === a ? a + (direction === "up" ? -1 : 1) : other.display_order;
    const supabase = createClient();
    await Promise.all([
      supabase.from("category_groups").update({ display_order: b }).eq("id", group.id),
      supabase.from("category_groups").update({ display_order: a }).eq("id", other.id),
    ]);
    refetch();
  }

  async function handleConfirmDeleteGroup() {
    if (!deleteGroupTarget) return;
    const supabase = createClient();
    const { error } = await supabase.from("category_groups").delete().eq("id", deleteGroupTarget.id);
    if (error) toast.error("Устгахад алдаа гарлаа");
    else {
      toast.success("Бүлэг устгагдлаа — ангиллууд «Бусад ангилал» руу шилжлээ");
      refetch();
    }
    setDeleteGroupTarget(null);
  }

  function openNewCategory(groupId: string) {
    setEditingCategory(null);
    setDefaultGroupId(groupId);
    setFormOpen(true);
  }

  return (
    <div>
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl">Ангилал ба цэс</h1>
          <p className="mt-0.5 text-sm text-muted">
            Хажуугийн цэс: бүлэг → ангилал гэж салаалж харагдана · {groups.length} бүлэг, {categories.length} ангилал
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingGroup(null);
              setGroupFormOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 rounded-full border border-neutral-300 px-4 py-2.5 text-sm font-medium hover:bg-neutral-200"
          >
            <FolderPlus size={16} /> Бүлэг нэмэх
          </button>
          <button
            type="button"
            onClick={() => openNewCategory("")}
            className="flex items-center justify-center gap-1.5 rounded-full bg-accent px-4.5 py-2.5 text-sm font-medium text-background hover:bg-accent-600"
          >
            <Plus size={16} /> Ангилал нэмэх
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {sections.map(({ group, categories: cats }) => {
          const GroupIcon = group ? getCategoryIcon(group.icon) : null;
          const gi = group ? sortedGroups.findIndex((g) => g.id === group.id) : -1;
          return (
            <section key={group?.id ?? "__ungrouped"} className="rounded-lg border border-neutral-300 bg-surface">
              <header className="flex items-center gap-3 border-b border-neutral-300 px-4 py-3">
                {group ? (
                  <>
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => handleMoveGroup(group, "up")}
                        disabled={gi <= 0}
                        className="rounded p-0.5 text-neutral-400 hover:bg-neutral-200 disabled:opacity-30"
                        aria-label="Дээш"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveGroup(group, "down")}
                        disabled={gi >= sortedGroups.length - 1}
                        className="rounded p-0.5 text-neutral-400 hover:bg-neutral-200 disabled:opacity-30"
                        aria-label="Доош"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-200 text-accent-900">
                      {GroupIcon && <GroupIcon size={16} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold">{group.name}</p>
                      <p className="truncate text-xs text-muted">
                        /{group.slug} · {cats.length} ангилал{!group.is_active && " · идэвхгүй"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openNewCategory(group.id)}
                      className="rounded-full px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent-100"
                    >
                      + Ангилал
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingGroup(group);
                        setGroupFormOpen(true);
                      }}
                      className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-200 hover:text-foreground"
                      aria-label="Бүлэг засах"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteGroupTarget(group)}
                      className="rounded-full p-1.5 text-neutral-500 hover:bg-accent-100 hover:text-accent-700"
                      aria-label="Бүлэг устгах"
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold">Бусад ангилал</p>
                    <p className="text-xs text-muted">Бүлэгт хамаараагүй — засаад бүлэг сонгоно уу</p>
                  </div>
                )}
              </header>

              {cats.length === 0 ? (
                <p className="px-4 py-4 text-sm text-muted">Энэ бүлэгт ангилал алга.</p>
              ) : (
                <ul className="divide-y divide-neutral-200">
                  {cats.map((category, i) => {
                    const Icon = getCategoryIcon(category.icon);
                    return (
                      <li key={category.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => handleMove(category, cats, "up")}
                            disabled={i === 0}
                            className="rounded p-0.5 text-neutral-400 hover:bg-neutral-200 disabled:opacity-30"
                            aria-label="Дээш"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMove(category, cats, "down")}
                            disabled={i === cats.length - 1}
                            className="rounded p-0.5 text-neutral-400 hover:bg-neutral-200 disabled:opacity-30"
                            aria-label="Доош"
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${category.color}29`, color: category.color }}
                        >
                          <Icon size={15} />
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
                              ? "bg-accent-2-200 text-accent-2-800"
                              : "bg-neutral-200 text-neutral-600"
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
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {formOpen && (
        <CategoryForm
          onClose={() => setFormOpen(false)}
          onSaved={refetch}
          editingCategory={editingCategory}
          groups={sortedGroups}
          defaultGroupId={defaultGroupId}
        />
      )}

      {groupFormOpen && (
        <GroupForm
          onClose={() => setGroupFormOpen(false)}
          onSaved={refetch}
          editing={editingGroup}
          nextOrder={(sortedGroups.at(-1)?.display_order ?? 0) + 1}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Ангилал устгах"
        description={`"${deleteTarget?.name}" ангиллыг устгахдаа итгэлтэй байна уу? Энэ ангилалд хамаарах мэдээллүүд "ангилалгүй" болно.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteGroupTarget}
        title="Бүлэг устгах"
        description={`"${deleteGroupTarget?.name}" бүлгийг устгах уу? Доторх ангиллууд устахгүй — «Бусад ангилал» руу шилжинэ.`}
        onConfirm={handleConfirmDeleteGroup}
        onCancel={() => setDeleteGroupTarget(null)}
      />
    </div>
  );
}
