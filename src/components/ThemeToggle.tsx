"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  /** Show the label next to the icon (sidebars). */
  withLabel?: boolean;
}

export default function ThemeToggle({ className, withLabel = false }: ThemeToggleProps) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  const label = dark ? "Гэрэлтэй горим" : "Харанхуй горим";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-neutral-300 text-foreground transition-colors hover:bg-neutral-200",
        withLabel ? "px-3.5 py-2.25 text-sm font-medium" : "h-10 w-10",
        className
      )}
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
      {withLabel && <span>{label}</span>}
    </button>
  );
}
