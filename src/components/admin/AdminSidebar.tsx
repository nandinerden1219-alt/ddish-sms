"use client";

import {
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  Link2,
  LogOut,
  Megaphone,
  Menu,
  Settings,
  Star,
  Tags,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/information", label: "Мэдээллүүд", icon: FileText },
  { href: "/admin/announcements", label: "Мэдэгдэл", icon: Megaphone },
  { href: "/admin/categories", label: "Ангилал ба цэс", icon: Tags },
  { href: "/admin/links", label: "Хэрэгтэй линк", icon: Link2 },
  { href: "/admin/popular", label: "Түгээмэл мэдээлэл", icon: Star },
  { href: "/admin/import", label: "Import Excel", icon: FileSpreadsheet },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-neutral-300 bg-surface px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent font-heading text-xs text-background">
            Д
          </span>
          <p className="text-sm font-semibold">Админ</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Цэс нээх"
          className="rounded-full p-2 hover:bg-neutral-200"
        >
          <Menu size={20} />
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-neutral-900/42 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 -translate-x-full flex-col border-r border-neutral-300 bg-surface transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0",
          open && "translate-x-0"
        )}
      >
        <div className="flex items-center justify-between border-b border-neutral-300 px-5 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent font-heading text-xs text-background">
              Д
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Админ</p>
              <p className="truncate text-xs text-muted">{email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Цэс хаах"
            className="rounded-full p-1.5 text-neutral-600 hover:bg-neutral-200 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.75 overflow-y-auto p-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-full px-3.5 py-2.25 text-sm font-medium transition-colors",
                  active ? "bg-accent-200 text-accent-900" : "text-foreground hover:bg-neutral-200"
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-0.75 border-t border-neutral-300 p-3">
          <Link
            href="/"
            className="block rounded-full px-3.5 py-2.25 text-sm text-muted hover:bg-neutral-200 hover:text-foreground"
          >
            ← Нийтийн хуудас
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-full px-3.5 py-2.25 text-sm font-medium text-accent-700 hover:bg-accent-100"
          >
            <LogOut size={16} /> Гарах
          </button>
        </div>
      </aside>
    </>
  );
}
