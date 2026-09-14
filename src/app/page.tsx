import HomeClient from "@/components/public/HomeClient";
import { isSupabaseConfigured } from "@/lib/env";
import {
  MOCK_ANNOUNCEMENTS,
  MOCK_CATEGORIES,
  MOCK_GROUPS,
  MOCK_ITEMS,
  MOCK_LINKS,
} from "@/lib/mockData";
import { createClient } from "@/lib/supabase/server";
import type { Announcement, CategoryGroup, UsefulLink } from "@/types";

export const dynamic = "force-dynamic";

const DEMO_NOTICE =
  "Demo горим — Supabase холбогдоогүй тул жишээ өгөгдөл харагдаж байна. .env.local-г README-ийн дагуу тохируулна уу.";
const SCHEMA_NOTICE =
  "Supabase холбогдсон боловч хүснэгтүүд үүсээгүй байна — supabase-schema.sql файлыг Supabase → SQL Editor дээр ажиллуулна уу. Түр жишээ өгөгдөл харагдаж байна.";
const MIGRATION_NOTICE =
  "Шинэ боломжуудын хүснэгтүүд (бүлэг / линк / пост) хараахан үүсээгүй — supabase-migrations/ доторх файлуудыг SQL Editor дээр ажиллуулна уу.";

function demo(notice: string) {
  return (
    <HomeClient
      initialGroups={MOCK_GROUPS}
      initialCategories={MOCK_CATEGORIES}
      initialItems={MOCK_ITEMS}
      announcements={MOCK_ANNOUNCEMENTS}
      links={MOCK_LINKS}
      copyCounts={{}}
      notice={notice}
    />
  );
}

export default async function Home() {
  if (!isSupabaseConfigured) return demo(DEMO_NOTICE);

  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const [categoriesRes, itemsRes, popularityRes, announcementsRes, groupsRes, linksRes] =
    await Promise.all([
      supabase.from("categories").select("*").eq("is_active", true).order("display_order"),
      supabase
        .from("information_items")
        .select("*")
        .eq("is_active", true)
        .order("display_order"),
      supabase.from("information_popularity").select("*"),
      supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("category_groups").select("*").eq("is_active", true).order("display_order"),
      supabase.from("useful_links").select("*").eq("is_active", true).order("display_order"),
    ]);

  // PGRST205 = table not found: the project exists but the schema wasn't run yet.
  if (categoriesRes.error?.code === "PGRST205" || itemsRes.error?.code === "PGRST205") {
    return demo(SCHEMA_NOTICE);
  }

  const copyCounts: Record<string, number> = {};
  for (const row of popularityRes.data ?? []) {
    copyCounts[row.information_id as string] =
      Number(row.copy_count ?? 0) + Number(row.copy_additional_count ?? 0);
  }

  // Tables added in later migrations may be missing on older databases —
  // degrade to "none" and tell the admin which migration to run.
  const missingNewTables =
    announcementsRes.error?.code === "PGRST205" ||
    groupsRes.error?.code === "PGRST205" ||
    linksRes.error?.code === "PGRST205";

  const announcements: Announcement[] = announcementsRes.error ? [] : (announcementsRes.data ?? []);
  const groups: CategoryGroup[] = groupsRes.error ? [] : (groupsRes.data ?? []);
  const links: UsefulLink[] = linksRes.error ? [] : (linksRes.data ?? []);

  // Older rows may lack group_id entirely (column added later).
  const categories = (categoriesRes.data ?? []).map((c) => ({ ...c, group_id: c.group_id ?? null }));

  return (
    <HomeClient
      initialGroups={groups}
      initialCategories={categories}
      initialItems={itemsRes.data ?? []}
      announcements={announcements}
      links={links}
      copyCounts={copyCounts}
      notice={missingNewTables ? MIGRATION_NOTICE : undefined}
    />
  );
}
