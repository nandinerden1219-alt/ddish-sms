"use client";

import { Check, Copy, History, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { copyInformation } from "@/lib/copyItem";
import { clearRecentCopies } from "@/lib/recent";
import { cn } from "@/lib/utils";
import type { InformationItem } from "@/types";

interface RecentCopiesProps {
  items: InformationItem[];
}

/** The agent's own last-copied items, one click away from copying again. */
export default function RecentCopies({ items }: RecentCopiesProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  if (items.length === 0) return null;

  async function handleCopy(item: InformationItem) {
    const ok = await copyInformation(item, "main");
    if (!ok) return;
    setCopiedId(item.id);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center gap-2">
        <History size={14} className="text-neutral-500" />
        <span className="text-[11px] font-semibold tracking-widest text-neutral-500 uppercase">
          Сүүлд хуулсан
        </span>
        <button
          type="button"
          onClick={clearRecentCopies}
          className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11.5px] text-neutral-600 hover:bg-neutral-200 hover:text-foreground"
        >
          <X size={12} /> Цэвэрлэх
        </button>
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => {
          const copied = copiedId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleCopy(item)}
              title={item.title}
              className={cn(
                "inline-flex max-w-72 shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors",
                copied
                  ? "border-accent-2-500 bg-accent-2-100 text-accent-2-900"
                  : "border-neutral-300 bg-surface text-foreground hover:border-accent-400 hover:bg-accent-100"
              )}
            >
              {copied ? (
                <Check size={13} className="shrink-0 text-accent-2-700" />
              ) : (
                <Copy size={13} className="shrink-0 text-neutral-600" />
              )}
              <span className="truncate">{item.title}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
