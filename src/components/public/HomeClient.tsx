"use client";

import { ChevronRight, CornerDownLeft, LayoutGrid } from "lucide-react";
import { useMemo, useState } from "react";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { copyInformation } from "@/lib/copyItem";
import { useRecentCopies } from "@/lib/recent";
import { searchItems } from "@/lib/search";
import { ALL_VIEW, type View } from "@/lib/views";
import type { Announcement, Category, CategoryGroup, InformationItem, UsefulLink } from "@/types";
import AnnouncementsBoard from "./AnnouncementsBoard";
import CategorySidebar, { type NavTree } from "./CategorySidebar";
import CategoryTabs from "./CategoryTabs";
import EmptyState from "./EmptyState";
import Header from "./Header";
import InformationCard from "./InformationCard";
import LinksBoard from "./LinksBoard";
import PopularSlider from "./PopularSlider";
import RecentCopies from "./RecentCopies";

/** Cards shown per category on the "all" overview before "Бүгдийг харах". */
const OVERVIEW_LIMIT = 6;

interface HomeClientProps {
  initialGroups: CategoryGroup[];
  initialCategories: Category[];
  initialItems: InformationItem[];
  announcements: Announcement[];
  links: UsefulLink[];
  copyCounts: Record<string, number>;
  /** Shown as a banner when sample data is being displayed instead of live data. */
  notice?: string;
}

export default function HomeClient({
  initialGroups,
  initialCategories,
  initialItems,
  announcements,
  links,
  copyCounts,
  notice,
}: HomeClientProps) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>(ALL_VIEW);
  const recentIds = useRecentCopies();

  const categoriesById = useMemo(() => {
    const map: Record<string, Category> = {};
    for (const cat of initialCategories) map[cat.id] = cat;
    return map;
  }, [initialCategories]);

  const itemsById = useMemo(() => {
    const map: Record<string, InformationItem> = {};
    for (const item of initialItems) map[item.id] = item;
    return map;
  }, [initialItems]);

  // Sidebar tree: groups (in order) → their categories; ungrouped last.
  const tree = useMemo<NavTree[]>(() => {
    const byGroup = new Map<string | null, Category[]>();
    for (const cat of initialCategories) {
      const key = cat.group_id && initialGroups.some((g) => g.id === cat.group_id) ? cat.group_id : null;
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key)!.push(cat);
    }
    const result: NavTree[] = initialGroups
      .filter((g) => (byGroup.get(g.id)?.length ?? 0) > 0)
      .map((g) => ({ group: g, categories: byGroup.get(g.id)! }));
    const ungrouped = byGroup.get(null);
    if (ungrouped && ungrouped.length > 0) result.push({ group: null, categories: ungrouped });
    return result;
  }, [initialGroups, initialCategories]);

  const popularItems = useMemo(
    () => initialItems.filter((item) => item.is_popular),
    [initialItems]
  );

  const recentItems = useMemo(
    () => recentIds.map((id) => itemsById[id]).filter((item): item is InformationItem => !!item),
    [recentIds, itemsById]
  );

  const searching = query.trim().length > 0;

  const searchFilteredItems = useMemo(
    () => searchItems(initialItems, query, categoriesById),
    [initialItems, query, categoriesById]
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of searchFilteredItems) {
      if (!item.category_id) continue;
      counts[item.category_id] = (counts[item.category_id] ?? 0) + 1;
    }
    return counts;
  }, [searchFilteredItems]);

  const displayedItems = useMemo(() => {
    if (searching) return searchFilteredItems;
    switch (view.kind) {
      case "category":
        return searchFilteredItems.filter((item) => item.category_id === view.id);
      case "group": {
        const ids = new Set(initialCategories.filter((c) => c.group_id === view.id).map((c) => c.id));
        return searchFilteredItems.filter((item) => item.category_id && ids.has(item.category_id));
      }
      default:
        return searchFilteredItems;
    }
  }, [searchFilteredItems, view, searching, initialCategories]);

  // In a group view, items are shown branching under their category.
  const groupSections = useMemo(() => {
    if (searching || view.kind !== "group") return null;
    const cats = initialCategories.filter((c) => c.group_id === view.id);
    return cats
      .map((cat) => ({ category: cat, items: displayedItems.filter((i) => i.category_id === cat.id) }))
      .filter((s) => s.items.length > 0);
  }, [searching, view, initialCategories, displayedItems]);

  // "All" is an overview: group → category → first few cards, mirroring the sidebar.
  const overviewSections = useMemo(() => {
    if (searching || view.kind !== "all") return null;
    return tree
      .map(({ group, categories }) => ({
        group,
        categories: categories
          .map((cat) => ({ category: cat, items: displayedItems.filter((i) => i.category_id === cat.id) }))
          .filter((s) => s.items.length > 0),
      }))
      .filter((g) => g.categories.length > 0);
  }, [searching, view, tree, displayedItems]);

  const enterTargetId = searching ? displayedItems[0]?.id : undefined;

  function handleSearchSubmit() {
    if (!searching) return;
    const first = displayedItems[0];
    if (first) void copyInformation(first, "main");
  }

  const listTitle = (() => {
    if (searching) return "Хайлтын үр дүн";
    switch (view.kind) {
      case "category":
        return categoriesById[view.id]?.name ?? "Мэдээлэл";
      case "group":
        return initialGroups.find((g) => g.id === view.id)?.name ?? "Мэдээлэл";
      default:
        return "Бүх мэдээлэл";
    }
  })();

  const isItemsView = searching || view.kind === "all" || view.kind === "group" || view.kind === "category";
  // Admin posts only on the home overview (and the dedicated Пост page).
  const showBoardStrip = !searching && view.kind === "all";
  const showQuickRows = !searching && view.kind === "all";

  return (
    <div className="flex min-h-screen flex-col">
      <Header query={query} onQueryChange={setQuery} onSearchSubmit={handleSearchSubmit} />
      {notice && (
        <div className="bg-accent-100 px-4 py-2 text-center text-xs font-medium text-accent-800 sm:px-6">
          {notice}
        </div>
      )}
      <CategoryTabs
        groups={initialGroups}
        categories={initialCategories}
        view={view}
        onChange={setView}
        counts={categoryCounts}
        totalCount={searchFilteredItems.length}
        postCount={announcements.length}
        linkCount={links.length}
      />

      <div className="mx-auto flex w-full max-w-340 flex-1 items-start gap-8 px-4 py-6 pb-20 sm:px-6">
        <CategorySidebar
          tree={tree}
          view={view}
          onChange={setView}
          counts={categoryCounts}
          totalCount={searchFilteredItems.length}
          postCount={announcements.length}
          linkCount={links.length}
        />

        <main className="min-w-0 flex-1">
          {showBoardStrip && (
            <AnnouncementsBoard
              announcements={announcements}
              mode="compact"
              onShowAll={() => setView({ kind: "posts" })}
            />
          )}

          {showQuickRows && (
            <>
              <RecentCopies items={recentItems} />
              <PopularSlider items={popularItems} categoriesById={categoriesById} />
            </>
          )}

          {/* ---- Posts page ---- */}
          {!searching && view.kind === "posts" && (
            <>
              <SectionTitle title="Пост" meta={`${announcements.length} пост`} />
              <AnnouncementsBoard announcements={announcements} mode="full" />
            </>
          )}

          {/* ---- Links page ---- */}
          {!searching && view.kind === "links" && (
            <>
              <SectionTitle title="Хэрэгтэй линк" meta={`${links.length} линк`} />
              <LinksBoard links={links} />
            </>
          )}

          {/* ---- Information items ---- */}
          {isItemsView && (
            <>
              <SectionTitle
                title={listTitle}
                meta={
                  <>
                    <span>{displayedItems.length} мэдээлэл</span>
                    {searching && displayedItems.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-neutral-500">
                        <kbd className="inline-flex items-center gap-0.5 rounded-sm border border-neutral-300 bg-surface px-1.5 py-0.5 text-[11px] font-medium">
                          <CornerDownLeft size={11} /> Enter
                        </kbd>
                        эхнийг хуулна
                      </span>
                    )}
                  </>
                }
              />

              {displayedItems.length === 0 ? (
                <EmptyState
                  message="Мэдээлэл олдсонгүй"
                  hint="Өөр үгээр хайж үзнэ үү (кирилл эсвэл латинаар), эсвэл ангиллаас сонгоно уу."
                />
              ) : overviewSections ? (
                <div className="space-y-10">
                  {overviewSections.map(({ group, categories: cats }) => {
                    const GroupIcon = group ? getCategoryIcon(group.icon) : LayoutGrid;
                    const total = cats.reduce((n, c) => n + c.items.length, 0);
                    return (
                      <section key={group?.id ?? "__ungrouped"}>
                        <button
                          type="button"
                          onClick={() => group && setView({ kind: "group", id: group.id })}
                          disabled={!group}
                          className="mb-4 flex w-full items-center gap-2.5 border-b border-neutral-300 pb-2.5 text-left disabled:cursor-default"
                          title={group ? "Энэ бүлгийг бүтнээр харах" : undefined}
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-200 text-accent-900">
                            <GroupIcon size={15} />
                          </span>
                          <h3 className="text-[17px]">{group?.name ?? "Бусад ангилал"}</h3>
                          <span className="text-[12.5px] text-neutral-500">{total}</span>
                          {group && <ChevronRight size={16} className="ml-auto text-neutral-500" />}
                        </button>

                        <div className="space-y-7">
                          {cats.map(({ category, items }) => (
                            <CategoryBlock
                              key={category.id}
                              category={category}
                              items={items}
                              limit={OVERVIEW_LIMIT}
                              copyCounts={copyCounts}
                              onOpen={() => setView({ kind: "category", id: category.id })}
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : groupSections ? (
                <div className="space-y-8">
                  {groupSections.map(({ category, items }) => (
                    <CategoryBlock
                      key={category.id}
                      category={category}
                      items={items}
                      copyCounts={copyCounts}
                      onOpen={() => setView({ kind: "category", id: category.id })}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 2xl:grid-cols-3">
                  {displayedItems.map((item) => (
                    <InformationCard
                      key={item.id}
                      item={item}
                      category={item.category_id ? categoriesById[item.category_id] : undefined}
                      initialCopyCount={copyCounts[item.id] ?? 0}
                      highlightQuery={searching ? query : ""}
                      isEnterTarget={item.id === enterTargetId}
                      hideCategory={!searching && view.kind === "category"}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <footer className="border-t border-divider px-4 py-4 text-center text-[12px] text-neutral-500 sm:px-6">
        Мэдээллийн сан · DDISH дотоод лавлах · {new Date().getFullYear()}
      </footer>
    </div>
  );
}

/** A category heading + its cards; optionally only the first `limit` with a link to the rest. */
function CategoryBlock({
  category,
  items,
  limit,
  copyCounts,
  onOpen,
}: {
  category: Category;
  items: InformationItem[];
  limit?: number;
  copyCounts: Record<string, number>;
  onOpen: () => void;
}) {
  const shown = limit ? items.slice(0, limit) : items;
  const rest = items.length - shown.length;
  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-2 rounded-full py-1 pr-3 text-left hover:bg-neutral-200/70"
          title="Зөвхөн энэ ангиллыг харах"
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color }} />
          <h4 className="text-[15px]">{category.name}</h4>
          <span className="text-[12px] text-neutral-500">{items.length}</span>
        </button>
        {rest > 0 && (
          <button
            type="button"
            onClick={onOpen}
            className="ml-auto rounded-full px-2.5 py-1 text-[12px] font-semibold text-accent-700 hover:bg-accent-100"
          >
            Бүгдийг харах (+{rest}) →
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 2xl:grid-cols-3">
        {shown.map((item) => (
          <InformationCard
            key={item.id}
            item={item}
            category={category}
            initialCopyCount={copyCounts[item.id] ?? 0}
            hideCategory
          />
        ))}
      </div>
    </section>
  );
}

function SectionTitle({ title, meta }: { title: string; meta: React.ReactNode }) {
  return (
    <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 className="text-[22px]">{title}</h2>
      <span className="flex flex-wrap items-center gap-x-3 text-[13px] text-neutral-600">{meta}</span>
    </div>
  );
}
