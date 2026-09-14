import PopularManager from "@/components/admin/PopularManager";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPopularPage() {
  const supabase = await createClient();
  const [{ data: items }, { data: categories }] = await Promise.all([
    supabase.from("information_items").select("*").order("display_order"),
    supabase.from("categories").select("*").order("display_order"),
  ]);

  return <PopularManager initialItems={items ?? []} categories={categories ?? []} />;
}
