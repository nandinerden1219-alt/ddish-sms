"use client";

import { Pin, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ANNOUNCEMENT_LEVELS } from "@/lib/announcementLevels";
import { createClient } from "@/lib/supabase/client";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import type { Announcement } from "@/types";
import AnnouncementForm from "./AnnouncementForm";
import ConfirmDialog from "./ConfirmDialog";

interface AnnouncementManagerProps {
  initialAnnouncements: Announcement[];
}

function isExpired(a: Announcement) {
  return !!a.expires_at && new Date(a.expires_at).getTime() < Date.now();
}

export default function AnnouncementManager({ initialAnnouncements }: AnnouncementManagerProps) {
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

  async function refetch() {
    const supabase = createClient();
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (data) setAnnouncements(data);
  }

  async function patch(a: Announcement, changes: Partial<Announcement>, successMsg: string) {
    const supabase = createClient();
    const { error } = await supabase.from("announcements").update(changes).eq("id", a.id);
    if (error) {
      toast.error("Шинэчлэхэд алдаа гарлаа");
      return;
    }
    toast.success(successMsg);
    refetch();
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    const supabase = createClient();
    const { error } = await supabase.from("announcements").delete().eq("id", deleteTarget.id);
    if (error) toast.error("Устгахад алдаа гарлаа");
    else {
      toast.success("Мэдэгдэл устгагдлаа");
      refetch();
    }
    setDeleteTarget(null);
  }

  const liveCount = announcements.filter((a) => a.is_active && !isExpired(a)).length;

  return (
    <div>
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl">Мэдэгдэл</h1>
          <p className="mt-0.5 text-sm text-muted">
            Нүүр хуудасны дээд хэсэгт бүх ажилтанд харагдана · одоо {liveCount} идэвхтэй
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="flex items-center justify-center gap-1.5 rounded-full bg-accent px-4.5 py-2.5 text-sm font-medium text-background hover:bg-accent-600"
        >
          <Plus size={16} /> Мэдэгдэл нийтлэх
        </button>
      </div>

      {announcements.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface py-16 text-center text-sm text-muted">
          Одоогоор мэдэгдэл алга. «Мэдэгдэл нийтлэх» дарж эхний постоо оруулна уу.
        </div>
      ) : (
        <div className="space-y-2.5">
          {announcements.map((a) => {
            const style = ANNOUNCEMENT_LEVELS[a.level] ?? ANNOUNCEMENT_LEVELS.info;
            const expired = isExpired(a);
            const live = a.is_active && !expired;
            return (
              <article
                key={a.id}
                className={cn(
                  "rounded-md border border-neutral-300 bg-surface p-4",
                  !live && "opacity-70"
                )}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      "rounded-full px-2.25 py-0.75 text-[10.5px] font-bold tracking-[0.08em] uppercase",
                      style.badge
                    )}
                  >
                    {style.label}
                  </span>
                  {a.is_pinned && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-700">
                      <Pin size={11} /> Тогтоосон
                    </span>
                  )}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.75 text-[10.5px] font-bold",
                      live ? "bg-accent-2-200 text-accent-2-800" : "bg-neutral-300 text-neutral-800"
                    )}
                  >
                    {expired ? "Хугацаа дууссан" : a.is_active ? "Нийтэд" : "Хаалттай"}
                  </span>
                  <span className="ml-auto text-[12px] text-neutral-600" title={formatDateTime(a.created_at)}>
                    {formatDate(a.created_at)}
                    {a.expires_at && ` → ${formatDate(a.expires_at)}`}
                  </span>
                </div>
                <h2 className="mt-1.5 text-[16px] leading-snug">{a.title}</h2>
                <p className="mt-1 line-clamp-2 text-[13.5px] whitespace-pre-wrap text-neutral-700">{a.body}</p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(a);
                      setFormOpen(true);
                    }}
                    className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-200"
                  >
                    Засах
                  </button>
                  <button
                    type="button"
                    onClick={() => patch(a, { is_pinned: !a.is_pinned }, a.is_pinned ? "Тогтоолтыг авлаа" : "Дээр нь тогтоолоо")}
                    className="rounded-full px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent-100"
                  >
                    {a.is_pinned ? "Тогтоолт авах" : "Тогтоох"}
                  </button>
                  <button
                    type="button"
                    onClick={() => patch(a, { is_active: !a.is_active }, a.is_active ? "Нүүр хуудаснаас нуулаа" : "Нүүр хуудсанд гаргалаа")}
                    className="rounded-full px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent-100"
                  >
                    {a.is_active ? "Нуух" : "Нийтлэх"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(a)}
                    className="rounded-full px-3 py-1.5 text-xs font-medium text-accent-700 hover:bg-accent-100"
                  >
                    Устгах
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {formOpen && (
        <AnnouncementForm onClose={() => setFormOpen(false)} onSaved={refetch} editing={editing} />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Мэдэгдэл устгах"
        description={`"${deleteTarget?.title}" мэдэгдлийг бүрмөсөн устгах уу? Түр нуухыг хүсвэл «Нуух» товчийг ашиглана уу.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
