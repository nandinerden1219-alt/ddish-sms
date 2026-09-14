"use client";

import { CornerDownLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { copyInformation } from "@/lib/copyItem";
import { useFavorites } from "@/lib/favorites";
import { useRecentCopies } from "@/lib/recent";
import { searchItems } from "@/lib/search";
import type { Category, InformationItem } from "@/types";
import CategorySidebar from "./CategorySidebar";
import CategoryTabs from "./CategoryTabs";
import EmptyState from "./EmptyState";
import Header from "./Header";
import InformationCard from "./InformationCard";
import PopularSlider from "./PopularSlider";
import RecentCopies from "./RecentCopies";

interface HomeClientProps {
  initialCategories: Category[];
  initialItems: InformationItem[];
  copyCounts: Record<string, number>;
  isDemo?: boolean;
}

export default function HomeClient({
  initialCategories,
  initialItems,
  copyCounts,
  isDemo = false,
}: HomeClientProps) {
  const [query, setQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [favView, setFavView] = useState(false);
  const { favorites } = useFavorites();
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

  const favCount = useMemo(
    () => searchFilteredItems.filter((item) => favorites.includes(item.id)).length,
    [searchFilteredItems, favorites]
  );

  const displayedItems = useMemo(() => {
    if (searching) return searchFilteredItems;
    if (favView) return searchFilteredItems.filter((item) => favorites.includes(item.id));
    if (activeCategoryId === null) return searchFilteredItems;
    return searchFilteredItems.filter((item) => item.category_id === activeCategoryId);
  }, [searchFilteredItems, activeCategoryId, favView, favorites, searching]);

  const enterTargetId = searching ? displayedItems[0]?.id : undefined;

  function selectAll() {
    setActiveCategoryId(null);
    setFavView(false);
  }

  function selectCategory(id: string) {
    setActiveCategoryId(id);
    setFavView(false);
  }

  function selectFavorites() {
    setFavView(true);
  }

  // Enter in the search box copies the top result: type → Enter → paste.
  function handleSearchSubmit() {
    if (!searching) return;
    const first = displayedItems[0];
    if (!first) return;
    void copyInformation(first, "main");
  }

  const listTitle = searching
    ? "Хайлтын үр дүн"
    : favView
      ? "Хадгалсан мэдээлэл"
      : activeCategoryId === null
        ? "Бүх мэдээлэл"
        : (categoriesById[activeCategoryId]?.name ?? "Мэдээлэл");

  return (
    <div className="flex min-h-screen flex-col">
      <Header query={query} onQueryChange={setQuery} onSearchSubmit={handleSearchSubmit} />
      {isDemo && (
        <div className="bg-accent-100 px-4 py-2 text-center text-xs font-medium text-accent-800 sm:px-6">
          Demo горим — Supabase холбогдоогүй тул жишээ өгөгдөл харагдаж байна.{" "}
          <code className="font-mono">.env.local</code>-г README-ийн дагуу тохируулна уу.
        </div>
      )}
      <CategoryTabs
        categories={initialCategories}
        activeId={activeCategoryId}
        favView={favView}
        onSelect={selectCategory}
        onSelectAll={selectAll}
        onSelectFavorites={selectFavorites}
        counts={categoryCounts}
        totalCount={searchFilteredItems.length}
        favCount={favCount}
      />

      <div className="mx-auto flex w-full max-w-340 flex-1 items-start gap-7.5 px-4 py-6.5 pb-20 sm:px-6">
        <CategorySidebar
          categories={initialCategories}
          activeId={activeCategoryId}
          favView={favView}
          onSelect={selectCategory}
          onSelectAll={selectAll}
          onSelectFavorites={selectFavorites}
          counts={categoryCounts}
          totalCount={searchFilteredItems.length}
          favCount={favCount}
        />

        <main className="min-w-0 flex-1">
          {!searching && !favView && (
            <>
              <RecentCopies items={recentItems} />
              <PopularSlider items={popularItems} categoriesById={categoriesById} />
            </>
          )}

          <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-[26px]">{listTitle}</h2>
            <span className="flex flex-wrap items-center gap-x-3 text-[13.5px] text-neutral-700">
              <span>{displayedItems.length} мэдээлэл олдлоо</span>
              {searching && displayedItems.length > 0 && (
                <span className="inline-flex items-center gap-1 text-neutral-600">
                  <kbd className="inline-flex items-center gap-0.5 rounded-sm border border-neutral-300 bg-surface px-1.5 py-0.5 text-[11px] font-medium">
                    <CornerDownLeft size={11} /> Enter
                  </kbd>
                  эхний мэдээллийг хуулна
                </span>
              )}
            </span>
          </div>

          {displayedItems.length === 0 ? (
            <EmptyState
              message="Мэдээлэл олдсонгүй"
              hint={
                favView
                  ? "Та одоогоор ямар ч мэдээлэл хадгалаагүй байна."
                  : "Өөр үгээр хайж үзнэ үү (кирилл эсвэл латинаар), эсвэл ангиллаас сонгоно уу."
              }
            />
          ) : (
            <div className="flex flex-col gap-3.5">
              {displayedItems.map((item) => (
                <InformationCard
                  key={item.id}
                  item={item}
                  category={item.category_id ? categoriesById[item.category_id] : undefined}
                  initialCopyCount={copyCounts[item.id] ?? 0}
                  highlightQuery={searching ? query : ""}
                  isEnterTarget={item.id === enterTargetId}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
