"use client";

import { ChevronDown, CornerDownLeft, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { copyInformation, type CopyKind } from "@/lib/copyItem";
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
  /** Hide the category pill (e.g. when every card in the list shares it). */
  hideCategory?: boolean;
}

export default function InformationCard({
  item,
  category,
  initialCopyCount,
  highlightQuery = "",
  isEnterTarget = false,
  hideCategory = false,
}: InformationCardProps) {
  const [open, setOpen] = useState(false);
  const [copyCount, setCopyCount] = useState(initialCopyCount);
  const [flash, setFlash] = useState<CopyKind | null>(null);

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

  // One click copies the extra text and reveals it so the agent sees what went out.
  async function copyAdditional() {
    const ok = await copy("additional");
    if (ok) setOpen(true);
    return ok;
  }

  // Clicking a text box copies it — unless the agent is selecting text.
  function handleBoxClick(kind: CopyKind) {
    if (window.getSelection()?.toString()) return;
    void copy(kind);
  }

  return (
    <article
      ref={cardRef}
      className={cn(
        "flex h-full animate-fade-in flex-col rounded-md border border-neutral-300 bg-surface p-4 shadow-sm transition-shadow hover:shadow-md",
        isEnterTarget && "ring-2 ring-accent-400"
      )}
      style={{ borderLeft: `4px solid ${tint}` }}
    >
      {(!hideCategory || showNewBadge || isEnterTarget || copyCount > 0) && (
        <div className="mb-1.5 flex items-center gap-1.5">
          {!hideCategory && (
            <span
              className="rounded-full px-2 py-0.5 text-[10.5px] font-bold tracking-[0.06em] uppercase"
              style={{ backgroundColor: `${tint}29`, color: tint }}
            >
              {category?.name ?? "Ангилалгүй"}
            </span>
          )}
          {showNewBadge && (
            <span className="rounded-full bg-accent-2-200 px-2 py-0.5 text-[10.5px] font-bold tracking-[0.06em] text-accent-2-800">
              ШИНЭ
            </span>
          )}
          {isEnterTarget && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 text-[10.5px] font-semibold text-accent-800">
              <CornerDownLeft size={11} /> Enter
            </span>
          )}
          {copyCount > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-neutral-500" title="Нийт хуулсан тоо">
              <Copy size={11} /> {copyCount}
            </span>
          )}
        </div>
      )}

      <h3 className="mb-2.5 text-[15.5px] leading-snug">
        <Highlight text={item.title} query={highlightQuery} />
      </h3>

      <div className="group relative mb-3 flex-1">
        <pre
          onClick={() => handleBoxClick("main")}
          title="Дарж хуулах"
          className={cn(
            "h-full cursor-pointer rounded-sm border bg-background p-3 font-sans text-[13.5px] leading-relaxed whitespace-pre-wrap wrap-break-word text-neutral-900 transition-colors",
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

      <div className="mt-auto flex flex-wrap items-center gap-2">
        <CopyButton onCopy={() => copy("main")} />
        {hasAdditional && (
          <>
            <CopyButton onCopy={copyAdditional} label="Нэмэлт хуулах" variant="secondary" />
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Нэмэлт мэдээллийг хумих" : "Нэмэлт мэдээллийг харах"}
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-200 hover:text-foreground"
            >
              <ChevronDown size={16} className={cn("transition-transform", open && "rotate-180")} />
            </button>
          </>
        )}
      </div>

      {open && hasAdditional && (
        <div className="mt-3 border-t border-dashed border-neutral-300 pt-3">
          <div className="mb-1.5 text-[10.5px] font-semibold tracking-[0.08em] text-accent-2-700 uppercase">
            Нэмэлт мэдээлэл
          </div>
          <pre
            onClick={() => handleBoxClick("additional")}
            title="Дарж хуулах"
            className={cn(
              "m-0 cursor-pointer rounded-sm border p-3 font-sans text-[13.5px] leading-relaxed whitespace-pre-wrap wrap-break-word text-accent-2-900 transition-colors",
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
