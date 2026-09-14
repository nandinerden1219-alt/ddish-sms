"use client";

import { CornerDownLeft, Copy, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { copyInformation, type CopyKind } from "@/lib/copyItem";
import { useFavorites } from "@/lib/favorites";
import { logUsage } from "@/lib/usage";
import { cn, isNew } from "@/lib/utils";
import type { Category, InformationItem } from "@/types";
import CopyButton from "./CopyButton";
import Highlight from "./Highlight";

interface InformationCardProps {
  item: InformationItem;
  category?: Category;
  initialCopyCount: number;
  highlightQuery?: string;
  isEnterTarget?: boolean;
}

export default function InformationCard({
  item,
  category,
  initialCopyCount,
  highlightQuery = "",
  isEnterTarget = false,
}: InformationCardProps) {
  const [open, setOpen] = useState(false);
  const [copyCount, setCopyCount] = useState(initialCopyCount);
  const [flash, setFlash] = useState<CopyKind | null>(null);
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(item.id);

  const cardRef = useRef<HTMLElement>(null);
  const hasLoggedView = useRef(false);
  const flashTimer = useRef<number | null>(null);

  const hasAdditional = !!item.additional_info?.trim();
  const showNewBadge = isNew(item.created_at);
  const tint = category?.color ?? "#a19786";

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !hasLoggedView.current) {
          hasLoggedView.current = true;
          logUsage(item.id, "view");
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [item.id]);

  useEffect(
    () => () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    },
    []
  );

  async function copy(kind: CopyKind) {
    const ok = await copyInformation(item, kind);
    if (!ok) return false;
    setCopyCount((n) => n + 1);
    setFlash(kind);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 700);
    return true;
  }

  // Clicking the message box copies it — unless the agent is selecting text.
  function handleBoxClick(kind: CopyKind) {
    if (window.getSelection()?.toString()) return;
    void copy(kind);
  }

  return (
    <article
      ref={cardRef}
      className={cn(
        "animate-fade-in rounded-md border border-neutral-300 bg-surface p-4.75 shadow-sm transition-shadow hover:shadow-md sm:p-5",
        isEnterTarget && "ring-2 ring-accent-300"
      )}
      style={{ borderLeft: `5px solid ${tint}` }}
    >
      <div className="mb-2.75 flex items-start gap-3.5">
        <div className="min-w-0 flex-1">
          <div className="mb-1.25 flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2.25 py-0.75 text-[10.5px] font-bold tracking-[0.08em] uppercase"
              style={{ backgroundColor: `${tint}29`, color: tint }}
            >
              {category?.name ?? "Ангилалгүй"}
            </span>
            {showNewBadge && (
              <span className="rounded-full bg-accent-2-200 px-2.25 py-0.75 text-[10.5px] font-bold tracking-[0.06em] text-accent-2-800">
                ШИНЭ
              </span>
            )}
            {isEnterTarget && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.75 text-[10.5px] font-semibold text-accent-800">
                <CornerDownLeft size={11} /> Enter
              </span>
            )}
          </div>
          <h3 className="text-[17.5px] leading-tight">
            <Highlight text={item.title} query={highlightQuery} />
          </h3>
        </div>
        <button
          type="button"
          aria-label={favorite ? "Хадгалснаас хасах" : "Хадгалах"}
          title="Хадгалах"
          onClick={() => toggleFavorite(item.id)}
          className={cn(
            "flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full border border-neutral-300 transition-colors hover:bg-neutral-200",
            favorite ? "text-accent" : "text-neutral-500"
          )}
        >
          <Star size={16} fill={favorite ? "var(--color-accent-300)" : "none"} />
        </button>
      </div>

      <div className="group relative mb-3.25">
        <pre
          onClick={() => handleBoxClick("main")}
          title="Дарж хуулах"
          className={cn(
            "cursor-pointer rounded-sm border bg-background p-3.5 font-sans text-[14.5px] leading-relaxed whitespace-pre-wrap break-words text-neutral-900 transition-colors",
            flash === "main"
              ? "border-accent-2-500 bg-accent-2-100"
              : "border-neutral-200 hover:border-accent-300"
          )}
        >
          {item.message}
        </pre>
        <span className="pointer-events-none absolute top-2 right-2 hidden items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[11px] text-neutral-600 shadow-sm group-hover:inline-flex">
          <Copy size={11} /> Дарж хуулах
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2.25">
        <CopyButton onCopy={() => copy("main")} />
        {hasAdditional && (
          <>
            <CopyButton
              onCopy={() => copy("additional")}
              label="Нэмэлт мэдээлэл хуулах"
              variant="secondary"
            />
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="min-h-11 rounded-full px-3.5 py-2.5 font-heading text-[13.5px] text-accent hover:bg-accent-100"
            >
              {open ? "Хумих" : "Дэлгэрэнгүй"}
            </button>
          </>
        )}
        {copyCount > 0 && (
          <span className="ml-auto text-[12.5px] text-neutral-600">{copyCount} удаа хуулсан</span>
        )}
      </div>

      {open && hasAdditional && (
        <div className="mt-3.25 border-t border-dashed border-neutral-300 pt-3">
          <div className="mb-1.75 text-[11px] font-semibold tracking-[0.08em] text-accent-2-700 uppercase">
            Нэмэлт мэдээлэл
          </div>
          <pre
            onClick={() => handleBoxClick("additional")}
            title="Дарж хуулах"
            className={cn(
              "m-0 cursor-pointer rounded-sm border p-3.5 font-sans text-[14px] leading-relaxed whitespace-pre-wrap break-words text-accent-2-900 transition-colors",
              flash === "additional"
                ? "border-accent-2-600 bg-accent-2-200"
                : "border-accent-2-200 bg-accent-2-100 hover:border-accent-2-400"
            )}
          >
            {item.additional_info}
          </pre>
        </div>
      )}
    </article>
  );
}
