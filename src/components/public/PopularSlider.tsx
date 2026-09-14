"use client";

import { Check, Copy } from "lucide-react";
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
    <section className="mb-7.5">
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="text-[22px]">Түгээмэл мэдээлэл</h2>
        <span className="text-[13px] text-neutral-600">Дарахад шууд хуулагдана</span>
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1.5">
        {items.map((item) => {
          const category = item.category_id ? categoriesById[item.category_id] : undefined;
          const copied = copiedId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleCopy(item)}
              className={cn(
                "flex w-65.5 shrink-0 flex-col gap-2.25 rounded-md border p-4 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98]",
                copied
                  ? "border-accent-2-500 bg-accent-2-100"
                  : "border-accent-200 bg-accent-100 hover:border-accent-400"
              )}
            >
              <span className="text-[11px] font-semibold tracking-[0.08em] text-accent-700 uppercase">
                {category?.name ?? "Мэдээлэл"}
              </span>
              <span className="font-heading text-[15.5px] leading-tight text-accent-900">
                {item.title}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-[12.5px] font-semibold",
                  copied ? "text-accent-2-800" : "text-accent-700"
                )}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Хуулсан" : "Хуулах"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
