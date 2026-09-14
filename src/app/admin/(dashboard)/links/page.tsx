import LinksManager from "@/components/admin/LinksManager";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLinksPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("useful_links").select("*").order("display_order");

  return <LinksManager initialLinks={data ?? []} />;
}
