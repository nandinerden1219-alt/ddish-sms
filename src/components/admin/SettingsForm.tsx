"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function SettingsForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой");
      return;
    }
    if (password !== confirm) {
      toast.error("Нууц үг таарахгүй байна");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) {
      toast.error("Нууц үг солиход алдаа гарлаа");
      return;
    }

    toast.success("Нууц үг амжилттай солигдлоо");
    setPassword("");
    setConfirm("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-surface p-5">
      <p className="text-sm font-semibold">Нууц үг солих</p>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">Шинэ нууц үг</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">
          Нууц үг давтах
        </label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200"
        />
      </div>
      <button
        type="submit"
        disabled={saving}
        className="min-h-11 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-background hover:bg-accent-600 disabled:opacity-60"
      >
        {saving ? "Хадгалж байна..." : "Нууц үг солих"}
      </button>
    </form>
  );
}
