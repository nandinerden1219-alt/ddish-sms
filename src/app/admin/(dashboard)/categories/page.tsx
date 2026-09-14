import CategoryManager from "@/components/admin/CategoryManager";
import { createClient } from "@/lib/supabase/server";
import type { Category, CategoryGroup } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const [{ data: categories }, groupsRes] = await Promise.all([
    supabase.from("categories").select("*").order("display_order"),
    supabase.from("category_groups").select("*").order("display_order"),
  ]);

  const groups: CategoryGroup[] = groupsRes.error ? [] : (groupsRes.data ?? []);
  const cats: Category[] = (categories ?? []).map((c) => ({ ...c, group_id: c.group_id ?? null }));

  return <CategoryManager initialCategories={cats} initialGroups={groups} />;
}
