"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface HScrollerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Horizontal strip that actually scrolls on a desktop: mouse wheel moves it
 * sideways, edge arrows page through it, and a thin scrollbar stays visible.
 */
export default function HScroller({ children, className }: HScrollerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // already horizontal
      const atStart = el!.scrollLeft <= 0;
      const atEnd = el!.scrollLeft + el!.clientWidth >= el!.scrollWidth - 1;
      if ((e.deltaY > 0 && atEnd) || (e.deltaY < 0 && atStart)) return; // let the page scroll
      e.preventDefault();
      el!.scrollLeft += e.deltaY;
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update); // fires once on observe → initial state
    ro.observe(el);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update]);

  function page(direction: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div ref={ref} className={cn("scrollbar-thin flex gap-2.5 overflow-x-auto pb-2", className)}>
        {children}
      </div>
      {canLeft && <EdgeButton side="left" onClick={() => page(-1)} />}
      {canRight && <EdgeButton side="right" onClick={() => page(1)} />}
    </div>
  );
}

function EdgeButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Өмнөх" : "Дараах"}
      className={cn(
        "absolute top-1/2 hidden h-9 w-9 -translate-y-[calc(50%+4px)] items-center justify-center rounded-full border border-neutral-300 bg-surface text-foreground shadow-md transition-colors hover:bg-neutral-200 sm:flex",
        side === "left" ? "left-1" : "right-1"
      )}
    >
      {side === "left" ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
    </button>
  );
}
