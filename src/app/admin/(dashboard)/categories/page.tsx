import CategoryManager from "@/components/admin/CategoryManager";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("*").order("display_order");

  return <CategoryManager initialCategories={categories ?? []} />;
}
