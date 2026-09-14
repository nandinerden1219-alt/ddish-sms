import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured) redirect("/admin/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 lg:flex-row">
      <AdminSidebar email={user.email ?? ""} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">{children}</div>
      </main>
    </div>
  );
}
