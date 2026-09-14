import DashboardCards from "@/components/admin/DashboardCards";
import { createClient } from "@/lib/supabase/server";
import { isUpdatedToday } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { count: totalInformation },
    { count: totalCategories },
    { count: totalPopular },
    { data: allItems },
    { data: popularityRows },
    { count: activeAnnouncements },
  ] = await Promise.all([
    supabase.from("information_items").select("*", { count: "exact", head: true }),
    supabase.from("categories").select("*", { count: "exact", head: true }),
    supabase
      .from("information_items")
      .select("*", { count: "exact", head: true })
      .eq("is_popular", true),
    supabase.from("information_items").select("id, title, updated_at"),
    supabase.from("information_popularity").select("*"),
    supabase
      .from("announcements")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`),
  ]);

  const todayCount = (allItems ?? []).filter((item) => isUpdatedToday(item.updated_at)).length;

  const popularityMap = new Map(
    (popularityRows ?? []).map((row) => [row.information_id as string, row])
  );

  const topUsed = (allItems ?? [])
    .map((item) => ({
      ...item,
      copy_count: Number(popularityMap.get(item.id)?.copy_count ?? 0),
    }))
    .filter((item) => item.copy_count > 0)
    .sort((a, b) => b.copy_count - a.copy_count)
    .slice(0, 5);

  return (
    <div>
      <h1 className="mb-1 text-xl">Хянах самбар</h1>
      <p className="mb-6 text-sm text-muted">Мэдээллийн сангийн ерөнхий тойм</p>

      <DashboardCards
        totalInformation={totalInformation ?? 0}
        totalCategories={totalCategories ?? 0}
        totalPopular={totalPopular ?? 0}
        todayUpdated={todayCount}
        activeAnnouncements={activeAnnouncements ?? 0}
      />

      <div className="mt-8 rounded-md border border-neutral-300 bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold">Хамгийн их ашиглагдсан мэдээлэл</h2>
        {topUsed.length === 0 ? (
          <p className="text-sm text-muted">
            Одоогоор ашиглалтын мэдээлэл бүртгэгдээгүй байна.
          </p>
        ) : (
          <ol className="space-y-1">
            {topUsed.map((item, i) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-neutral-50"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-500">
                    {i + 1}
                  </span>
                  <span className="truncate text-sm font-medium">{item.title}</span>
                </span>
                <span className="shrink-0 text-xs font-medium text-neutral-500">
                  {item.copy_count} удаа хуулсан
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
