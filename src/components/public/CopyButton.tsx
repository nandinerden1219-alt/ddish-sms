"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  onCopy: () => Promise<boolean>;
  label?: string;
  copiedLabel?: string;
  variant?: "primary" | "secondary";
  size?: "md" | "sm";
  className?: string;
}

export default function CopyButton({
  onCopy,
  label = "Хуулах",
  copiedLabel = "Хуулсан",
  variant = "primary",
  size = "md",
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    const ok = await onCopy();
    if (!ok) return;
    setCopied(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1500);
  }

  const iconSize = size === "md" ? 15 : 13;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-semibold transition-all active:scale-[0.97]",
        size === "md" ? "min-h-10 px-4 text-[13.5px]" : "min-h-8 px-3 text-[12px]",
        variant === "primary" &&
          (copied ? "bg-accent-2-600 text-white" : "bg-accent text-background hover:bg-accent-600"),
        variant === "secondary" &&
          (copied
            ? "border border-accent-2-600 bg-accent-2-600 text-white"
            : "border border-neutral-300 bg-transparent text-foreground hover:bg-neutral-200"),
        className
      )}
    >
      {copied ? <Check size={iconSize} /> : <Copy size={iconSize} />}
      {copied ? copiedLabel : label}
    </button>
  );
}
