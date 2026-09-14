import SettingsForm from "@/components/admin/SettingsForm";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div>
      <h1 className="text-xl font-semibold">Тохиргоо</h1>
      <p className="mt-0.5 text-sm text-muted">Админ бүртгэлийн тохиргоо</p>

      <div className="mt-6 max-w-md rounded-lg border border-border bg-surface p-5">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-400">
          Нэвтэрсэн хэрэглэгч
        </p>
        <p className="text-sm font-medium">{user?.email}</p>
      </div>

      <div className="mt-6 max-w-md">
        <SettingsForm />
      </div>
    </div>
  );
}
