"use client";

import { BookOpen, ChevronRight, Pencil, Search } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { blockSummary, parseKnowledge, type KnowledgeBlock, type KnowledgeGroup } from "@/lib/knowledgeFormat";
import { cn } from "@/lib/utils";
import type { AssistantKnowledge } from "@/types";

const BUTTON_COLORS: Record<string, string> = {
  цэнхэр: "#3b82f6",
  улаан: "#ef4444",
  ногоон: "#22c55e",
  шар: "#eab308",
};

// URLs, "quoted labels", remote-button colours, menu arrows and numbers get their own styling.
// Groups: 1 url, 2 quote, 3 colour, 4 arrow, 5 number. Built with new RegExp because the
// lookbehinds / \p{L} are ES2018 syntax and tsconfig targets ES2017 (browsers support it).
const TOKEN = new RegExp(
  String.raw`(https?:\/\/[^\s)]+)|"([^"\n]{1,80})"|(?<!\p{L})(цэнхэр|улаан|ногоон|шар)(?!\p{L})|(→)|(?<![\p{L}\p{N}.])(\d+(?:[.,]\d+)*%?)`,
  "giu"
);

/** Knowledge text with links, button colours, labels and numbers highlighted. */
export function KnowledgeInline({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const g = { url: m[1], quote: m[2], color: m[3], arrow: m[4], num: m[5] };
    const index = m.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    const key = index;
    if (g.url) {
      nodes.push(
        <a
          key={key}
          href={g.url}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-accent-700 underline underline-offset-2 hover:text-accent-900"
        >
          {g.url}
        </a>
      );
    } else if (g.quote) {
      nodes.push(
        <span key={key} className="rounded bg-neutral-200/80 px-1 py-px font-medium text-foreground">
          {g.quote}
        </span>
      );
    } else if (g.color) {
      nodes.push(
        <span key={key} className="inline-flex items-center gap-1 font-semibold">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
            style={{ backgroundColor: BUTTON_COLORS[g.color.toLowerCase()] }}
          />
          {g.color}
        </span>
      );
    } else if (g.arrow) {
      nodes.push(
        <span key={key} className="mx-0.5 font-semibold text-accent-600">
          →
        </span>
      );
    } else if (g.num) {
      nodes.push(
        <b key={key} className="font-semibold text-accent-800">
          {g.num}
        </b>
      );
    }
    last = index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

function MenuPath({ parts }: { parts: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && <ChevronRight size={14} className="shrink-0 text-accent-500" />}
          <span className="rounded-md border border-accent-300 bg-accent-100 px-2 py-0.5 text-[12.5px] font-medium text-accent-900">
            {/* The chip already frames the step, so drop the quotes that would box it twice. */}
            <KnowledgeInline text={part.replace(/^"(.*)"$/, "$1")} />
          </span>
        </Fragment>
      ))}
    </div>
  );
}

function Block({ block }: { block: KnowledgeBlock }) {
  switch (block.kind) {
    case "bullet":
      return (
        <div className="flex gap-2">
          <span className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
          <p className="min-w-0">
            <KnowledgeInline text={block.text} />
          </p>
        </div>
      );
    case "step":
      return (
        <div className="flex gap-2">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-background">
            {block.n}
          </span>
          <p className="min-w-0">
            <KnowledgeInline text={block.text} />
          </p>
        </div>
      );
    case "path":
      return <MenuPath parts={block.parts} />;
    default:
      return (
        <p className="text-neutral-700">
          <KnowledgeInline text={block.text} />
        </p>
      );
  }
}

interface ParsedSection {
  section: AssistantKnowledge;
  groups: KnowledgeGroup[];
}

function useParsed(sections: AssistantKnowledge[]): ParsedSection[] {
  return useMemo(() => sections.map((section) => ({ section, groups: parseKnowledge(section.content) })), [sections]);
}

function InactiveBadge() {
  return (
    <span className="shrink-0 rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
      Хаалттай — AI ашиглахгүй
    </span>
  );
}

/** All knowledge as a readable document: table of contents, search, one card per section. */
export function KnowledgeDocView({
  sections,
  onEdit,
}: {
  sections: AssistantKnowledge[];
  onEdit: (section: AssistantKnowledge) => void;
}) {
  const [query, setQuery] = useState("");
  const parsed = useParsed(sections);
  const q = query.trim().toLowerCase();
  const shown = q
    ? parsed.filter(({ section }) => `${section.title}\n${section.content}`.toLowerCase().includes(q))
    : parsed;

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-neutral-300 bg-surface p-3">
        <label className="flex items-center gap-2 rounded-full border border-border bg-background px-3.5 py-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-200">
          <Search size={15} className="shrink-0 text-neutral-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Мэдлэгээс хайх… (жишээ нь reset, 976, Konka)"
            style={{ outline: "none" }}
            className="min-w-0 flex-1 bg-transparent text-sm"
          />
        </label>
        <nav className="flex flex-wrap gap-1.5" aria-label="Агуулга">
          {parsed.map(({ section }) => (
            <button
              key={section.id}
              type="button"
              onClick={() =>
                document.getElementById(`kn-${section.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className={cn(
                "rounded-full border border-neutral-300 bg-background px-3 py-1 text-[12.5px] hover:border-accent hover:bg-accent-100",
                !section.is_active && "opacity-60"
              )}
            >
              {section.title}
            </button>
          ))}
        </nav>
      </div>

      {shown.length === 0 && (
        <p className="rounded-xl border border-dashed border-border bg-surface py-10 text-center text-sm text-muted">
          &quot;{query}&quot; олдсонгүй
        </p>
      )}

      {shown.map(({ section, groups }) => (
        <article
          key={section.id}
          id={`kn-${section.id}`}
          className={cn(
            "scroll-mt-6 overflow-hidden rounded-xl border border-neutral-300 bg-surface",
            !section.is_active && "opacity-70"
          )}
        >
          <header className="flex items-center gap-3 border-b border-neutral-300 bg-accent-100/60 px-4 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-background">
              <BookOpen size={15} />
            </span>
            <h2 className="min-w-0 flex-1 text-[16px] font-semibold">{section.title}</h2>
            {!section.is_active && <InactiveBadge />}
            <button
              type="button"
              onClick={() => onEdit(section)}
              className="shrink-0 rounded-full p-1.5 text-neutral-500 hover:bg-neutral-200 hover:text-foreground"
              aria-label="Засах"
              title="Засах"
            >
              <Pencil size={15} />
            </button>
          </header>
          <div className="space-y-4 px-4 py-4 text-[14px] leading-relaxed">
            {groups.map((group, i) => (
              <section key={i}>
                {group.heading && (
                  <h3 className="mb-2 text-[12px] font-semibold tracking-[0.06em] text-accent-700 uppercase">
                    <KnowledgeInline text={group.heading} />
                  </h3>
                )}
                <div className="space-y-1.5">
                  {group.blocks.map((block, j) => (
                    <Block key={j} block={block} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

/** All knowledge as a tree: section → sub-topics → one-line facts. */
export function KnowledgeSchemaView({ sections }: { sections: AssistantKnowledge[] }) {
  const parsed = useParsed(sections);

  return (
    <div className="space-y-4">
      {parsed.map(({ section, groups }) => (
        <div
          key={section.id}
          className={cn("rounded-xl border border-neutral-300 bg-surface p-4", !section.is_active && "opacity-70")}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3.5 py-1.5 text-sm font-semibold text-background">
              <BookOpen size={14} /> {section.title}
            </span>
            {!section.is_active && <InactiveBadge />}
          </div>

          <ul className="mt-3 ml-4 space-y-3 border-l-2 border-accent-300 pl-5">
            {groups.map((group, i) => (
              <li
                key={i}
                className="relative before:absolute before:top-3.5 before:-left-5 before:h-0.5 before:w-5 before:bg-accent-300"
              >
                <span className="inline-block rounded-lg border border-accent-300 bg-accent-100 px-2.5 py-1 text-[13px] font-semibold text-accent-900">
                  {group.heading ? <KnowledgeInline text={group.heading} /> : "Ерөнхий"}
                </span>
                <ul className="mt-1.5 ml-3 space-y-1 border-l border-dashed border-neutral-400 pl-4">
                  {group.blocks.map((block, j) => (
                    <li
                      key={j}
                      title={blockSummary(block, Infinity)}
                      className="relative text-[12.5px] leading-relaxed text-neutral-700 before:absolute before:top-2.5 before:-left-4 before:w-3 before:border-t before:border-dashed before:border-neutral-400"
                    >
                      {block.kind === "step" && <b className="mr-1 text-accent-700">{block.n}.</b>}
                      <KnowledgeInline text={blockSummary(block)} />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
