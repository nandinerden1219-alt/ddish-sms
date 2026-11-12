import KnowledgeManager from "@/components/admin/KnowledgeManager";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminKnowledgePage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("assistant_knowledge").select("*").order("display_order");

  // PGRST205 = table not found: the knowledge migration hasn't been run yet.
  return <KnowledgeManager initialSections={data ?? []} missingTable={error?.code === "PGRST205"} />;
}
