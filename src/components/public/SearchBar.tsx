"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "Мэдээлэл хайх…  ( / )",
  className,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (e.key === "/" && !isTyping) {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit?.();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      if (value) onChange("");
      else inputRef.current?.blur();
    }
  }

  return (
    <div className={cn("relative", className)}>
      <Search
        size={18}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600"
      />
      <input
        ref={inputRef}
        type="text"
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleInputKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded-full border border-neutral-300 bg-neutral-100 py-2.75 pr-11 pl-11 text-[14.5px] text-foreground outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent-200"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          aria-label="Хайлтыг цэвэрлэх"
          className="absolute top-1/2 right-2 flex h-7.5 w-7.5 -translate-y-1/2 items-center justify-center rounded-full bg-neutral-200 text-neutral-700 hover:bg-neutral-300"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
