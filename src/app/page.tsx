import HomeClient from "@/components/public/HomeClient";
import { isSupabaseConfigured } from "@/lib/env";
import { MOCK_CATEGORIES, MOCK_ITEMS } from "@/lib/mockData";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!isSupabaseConfigured) {
    return (
      <HomeClient
        initialCategories={MOCK_CATEGORIES}
        initialItems={MOCK_ITEMS}
        copyCounts={{}}
        isDemo
      />
    );
  }

  const supabase = await createClient();

  const [{ data: categories }, { data: items }, { data: popularity }] = await Promise.all([
    supabase.from("categories").select("*").eq("is_active", true).order("display_order"),
    supabase
      .from("information_items")
      .select("*")
      .eq("is_active", true)
      .order("display_order"),
    supabase.from("information_popularity").select("*"),
  ]);

  const copyCounts: Record<string, number> = {};
  for (const row of popularity ?? []) {
    copyCounts[row.information_id as string] =
      Number(row.copy_count ?? 0) + Number(row.copy_additional_count ?? 0);
  }

  return (
    <HomeClient
      initialCategories={categories ?? []}
      initialItems={items ?? []}
      copyCounts={copyCounts}
    />
  );
}
