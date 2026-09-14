"use client";

import { CornerDownLeft } from "lucide-react";
import { useMemo, useState } from "react";
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
  const showBoardStrip = !searching && view.kind !== "posts" && view.kind !== "links";
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
              ) : groupSections ? (
                <div className="space-y-8">
                  {groupSections.map(({ category, items }) => (
                    <section key={category.id}>
                      <button
                        type="button"
                        onClick={() => setView({ kind: "category", id: category.id })}
                        className="mb-3 inline-flex items-center gap-2 rounded-full py-1 pr-3 text-left hover:bg-neutral-200/70"
                        title="Зөвхөн энэ ангиллыг харах"
                      >
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color }} />
                        <h3 className="text-[16px]">{category.name}</h3>
                        <span className="text-[12.5px] text-neutral-500">{items.length}</span>
                      </button>
                      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 2xl:grid-cols-3">
                        {items.map((item) => (
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

function SectionTitle({ title, meta }: { title: string; meta: React.ReactNode }) {
  return (
    <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 className="text-[22px]">{title}</h2>
      <span className="flex flex-wrap items-center gap-x-3 text-[13px] text-neutral-600">{meta}</span>
    </div>
  );
}
