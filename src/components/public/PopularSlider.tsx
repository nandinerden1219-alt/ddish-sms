"use client";

import { Check, Copy, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { copyInformation } from "@/lib/copyItem";
import { cn } from "@/lib/utils";
import type { Category, InformationItem } from "@/types";

interface PopularSliderProps {
  items: InformationItem[];
  categoriesById: Record<string, Category>;
}

export default function PopularSlider({ items, categoriesById }: PopularSliderProps) {
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
    <section className="mb-7">
      <div className="mb-2 flex items-center gap-2">
        <Zap size={14} className="text-accent-700" />
        <span className="text-[11px] font-semibold tracking-widest text-neutral-500 uppercase">
          Түгээмэл
        </span>
        <span className="text-[12px] text-neutral-500">дарахад шууд хуулагдана</span>
      </div>
      <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1">
        {items.map((item) => {
          const category = item.category_id ? categoriesById[item.category_id] : undefined;
          const copied = copiedId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleCopy(item)}
              className={cn(
                "flex w-60 shrink-0 flex-col gap-1.5 rounded-md border p-3.5 text-left transition-all active:scale-[0.98]",
                copied
                  ? "border-accent-2-500 bg-accent-2-100"
                  : "border-accent-200 bg-accent-100 hover:border-accent-400 hover:shadow-sm"
              )}
            >
              <span className="truncate text-[10.5px] font-semibold tracking-[0.06em] text-accent-700 uppercase">
                {category?.name ?? "Мэдээлэл"}
              </span>
              <span className="line-clamp-2 text-[14px] leading-snug font-semibold text-accent-900">
                {item.title}
              </span>
              <span
                className={cn(
                  "mt-auto inline-flex items-center gap-1.5 pt-1 text-[12px] font-semibold",
                  copied ? "text-accent-2-800" : "text-accent-700"
                )}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Хуулсан" : "Хуулах"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
