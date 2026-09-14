"use client";

import { Check, Copy, ExternalLink, Link2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";
import { cn } from "@/lib/utils";
import type { UsefulLink } from "@/types";

interface LinksBoardProps {
  links: UsefulLink[];
}

function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function LinksBoard({ links }: LinksBoardProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  async function copyUrl(link: UsefulLink) {
    const ok = await copyToClipboard(link.url);
    if (!ok) {
      toast.error("Хуулж чадсангүй");
      return;
    }
    toast.success("Линкийг хууллаа", { description: link.url });
    setCopiedId(link.id);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopiedId(null), 1500);
  }

  if (links.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-400 py-13.5 text-center text-neutral-700">
        <Link2 size={34} className="mb-3 text-neutral-500" />
        <p className="font-heading text-[19px] text-foreground">Линк алга</p>
        <p className="mt-1.5 text-sm">Админ «Хэрэгтэй линк» хэсгээс нэмнэ.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 2xl:grid-cols-3">
      {links.map((link) => {
        const copied = copiedId === link.id;
        return (
          <article
            key={link.id}
            className="flex h-full flex-col rounded-md border border-neutral-300 bg-surface p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700">
                <Link2 size={15} />
              </span>
              <span className="truncate text-[11.5px] font-semibold tracking-[0.06em] text-neutral-600 uppercase">
                {domainOf(link.url)}
              </span>
            </div>
            <h3 className="text-[16px] leading-snug">{link.title}</h3>
            {link.description && (
              <p className="mt-1 text-[13.5px] leading-relaxed text-neutral-700">{link.description}</p>
            )}
            <p className="mt-2 truncate font-mono text-[12px] text-neutral-500" title={link.url}>
              {link.url}
            </p>
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-[13.5px] font-semibold text-background transition-colors hover:bg-accent-600"
              >
                <ExternalLink size={15} /> Нээх
              </a>
              <button
                type="button"
                onClick={() => copyUrl(link)}
                className={cn(
                  "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-[13.5px] font-semibold transition-colors",
                  copied
                    ? "border-accent-2-600 bg-accent-2-600 text-white"
                    : "border-neutral-300 text-foreground hover:bg-neutral-200"
                )}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Хуулсан" : "Линк хуулах"}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
