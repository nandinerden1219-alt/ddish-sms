"use client";

import { Check, Copy, Megaphone, Pin, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ANNOUNCEMENT_LEVELS } from "@/lib/announcementLevels";
import { copyToClipboard } from "@/lib/clipboard";
import { useDismissedAnnouncements } from "@/lib/dismissed";
import { cn, formatDate, formatRelativeTime, isNew } from "@/lib/utils";
import type { Announcement } from "@/types";

interface AnnouncementsBoardProps {
  announcements: Announcement[];
  /**
   * "compact": the strip at the top of the home views — respects per-browser
   * dismissals and shows only pinned + the latest few, with a "see all" link.
   * "full": the Пост page — everything, nothing hidden.
   */
  mode?: "compact" | "full";
  onShowAll?: () => void;
}

const LONG_BODY = 320;
const COMPACT_LIMIT = 3;

export default function AnnouncementsBoard({
  announcements,
  mode = "compact",
  onShowAll,
}: AnnouncementsBoardProps) {
  const { dismissed, dismiss, restoreAll } = useDismissedAnnouncements();
  const compact = mode === "compact";

  const visible = useMemo(() => {
    if (!compact) return announcements;
    const notDismissed = announcements.filter((a) => !dismissed.includes(a.id));
    const pinned = notDismissed.filter((a) => a.is_pinned);
    const rest = notDismissed.filter((a) => !a.is_pinned).slice(0, COMPACT_LIMIT);
    return [...pinned, ...rest];
  }, [announcements, dismissed, compact]);

  const hiddenCount = compact ? announcements.filter((a) => dismissed.includes(a.id)).length : 0;
  const moreCount = compact ? announcements.length - hiddenCount - visible.length : 0;

  if (announcements.length === 0) {
    if (compact) return null;
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-400 py-13.5 text-center text-neutral-700">
        <Megaphone size={34} className="mb-3 text-neutral-500" />
        <p className="font-heading text-[19px] text-foreground">Пост алга</p>
        <p className="mt-1.5 text-sm">Админ «Мэдэгдэл» хэсгээс шинэ пост нийтэлнэ.</p>
      </div>
    );
  }

  return (
    <section className={cn(compact && "mb-6")}>
      {compact && (
        <div className="mb-2.5 flex items-center gap-2">
          <Megaphone size={14} className="text-accent-700" />
          <span className="text-[11px] font-semibold tracking-widest text-neutral-500 uppercase">
            Админы пост
          </span>
          <span className="text-[12px] text-neutral-500">{visible.length}</span>
          <span className="ml-auto flex items-center gap-1">
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={restoreAll}
                className="rounded-full px-2.5 py-1 text-[12px] text-neutral-600 hover:bg-neutral-200 hover:text-foreground"
              >
                Хаасныг харуулах ({hiddenCount})
              </button>
            )}
            {onShowAll && (
              <button
                type="button"
                onClick={onShowAll}
                className="rounded-full px-2.5 py-1 text-[12px] font-semibold text-accent-700 hover:bg-accent-100"
              >
                Бүх пост{moreCount > 0 ? ` (+${moreCount})` : ""} →
              </button>
            )}
          </span>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-400 px-4 py-3 text-[13px] text-neutral-600">
          Бүх постыг хаасан байна.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {visible.map((a) => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              onDismiss={compact ? () => dismiss(a.id) : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function AnnouncementCard({
  announcement: a,
  onDismiss,
}: {
  announcement: Announcement;
  onDismiss?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);
  const style = ANNOUNCEMENT_LEVELS[a.level] ?? ANNOUNCEMENT_LEVELS.info;
  const isLong = a.body.length > LONG_BODY;
  const fresh = isNew(a.created_at, 2);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  async function handleCopy() {
    const ok = await copyToClipboard(a.body);
    if (!ok) {
      toast.error("Хуулж чадсангүй");
      return;
    }
    toast.success("Мэдэгдлийг хууллаа", { description: a.title });
    setCopied(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <article className={cn("rounded-md border-l-5 border p-4 shadow-sm", style.card)}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded-full px-2.25 py-0.75 text-[10.5px] font-bold tracking-[0.08em] uppercase",
                style.badge
              )}
            >
              {style.label}
            </span>
            {a.is_pinned && (
              <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold", style.accent)}>
                <Pin size={11} /> Тогтоосон
              </span>
            )}
            {fresh && (
              <span className="rounded-full bg-accent-2-200 px-2 py-0.75 text-[10.5px] font-bold tracking-[0.06em] text-accent-2-800">
                ШИНЭ
              </span>
            )}
            <span className="ml-auto text-[12px] text-neutral-600" title={formatRelativeTime(a.created_at)}>
              {formatDate(a.created_at)}
            </span>
          </div>
          <h3 className="text-[16px] leading-snug">{a.title}</h3>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Постыг хаах"
            title="Хаах (зөвхөн энэ төхөөрөмж дээр)"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-200/70 hover:text-foreground"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <p
        className={cn(
          "mt-2 text-[14px] leading-relaxed whitespace-pre-wrap wrap-break-word text-neutral-900",
          isLong && !expanded && "line-clamp-4"
        )}
      >
        {a.body}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.75 text-[12.5px] font-semibold transition-colors",
            copied
              ? "border-accent-2-600 bg-accent-2-600 text-white"
              : "border-neutral-300/80 bg-surface text-foreground hover:bg-neutral-200"
          )}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Хуулсан" : "Текстийг хуулах"}
        </button>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={cn("rounded-full px-3 py-1.75 text-[12.5px] font-semibold hover:bg-neutral-200/60", style.accent)}
          >
            {expanded ? "Хумих" : "Дэлгэрэнгүй"}
          </button>
        )}
        <span className="ml-auto text-[12px] text-neutral-600">{formatRelativeTime(a.created_at)}</span>
      </div>
    </article>
  );
}
