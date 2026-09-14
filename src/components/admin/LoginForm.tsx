"use client";

import { Loader2, Lock, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isSupabaseConfigured) {
      toast.error("Supabase холболт тохируулагдаагүй байна. .env.local файлыг README-ийн дагуу үүсгэнэ үү.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      toast.error("Имэйл эсвэл нууц үг буруу байна");
      return;
    }

    const next = searchParams.get("next") || "/admin";
    router.push(next);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-neutral-300 bg-surface p-8 shadow-md"
    >
      <div className="mb-3.5">
        <label className="mb-1.5 block text-[12.5px] font-semibold">И-мэйл</label>
        <div className="relative">
          <Mail size={16} className="absolute top-1/2 left-4 -translate-y-1/2 text-neutral-600" />
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-full border border-neutral-300 bg-background py-2.75 pr-4 pl-10.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200"
            placeholder="admin@ddishtv.mn"
          />
        </div>
      </div>
      <div className="mb-2">
        <label className="mb-1.5 block text-[12.5px] font-semibold">Нууц үг</label>
        <div className="relative">
          <Lock size={16} className="absolute top-1/2 left-4 -translate-y-1/2 text-neutral-600" />
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-full border border-neutral-300 bg-background py-2.75 pr-4 pl-10.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200"
            placeholder="••••••••"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="mt-2 flex min-h-11.5 w-full items-center justify-center gap-2 rounded-full bg-accent text-[15px] font-semibold text-background transition-colors hover:bg-accent-600 disabled:opacity-60"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        Нэвтрэх
      </button>
    </form>
  );
}
