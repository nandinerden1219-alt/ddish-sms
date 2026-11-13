import KnowledgeManager from "@/components/admin/KnowledgeManager";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminKnowledgePage() {
  const supabase = await createClient();
  const [{ data, error }, ckb] = await Promise.all([
    supabase.from("assistant_knowledge").select("*").order("display_order"),
    supabase
      .from("ckb_docs")
      .select("chunk_key, short_id, category, article_title, part, content, url, source_updated_at")
      .order("category")
      .order("article_title")
      .order("chunk_key")
      .limit(5000),
  ]);

  // PGRST205 = table not found: the knowledge migration hasn't been run yet.
  // A missing ckb_docs table just means the CKB hasn't been imported.
  return (
    <KnowledgeManager
      initialSections={data ?? []}
      missingTable={error?.code === "PGRST205"}
      ckbDocs={ckb.error ? [] : (ckb.data ?? [])}
    />
  );
}
