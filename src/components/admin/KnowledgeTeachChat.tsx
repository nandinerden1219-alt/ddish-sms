"use client";

import { MessageSquarePlus, SendHorizontal, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import NandiaAvatar from "@/components/public/NandiaAvatar";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/** A knowledge change the server already saved; undoable from the chat. */
interface Change {
  type: "create" | "update";
  id: string;
  title: string;
  summary: string;
  previous?: { title: string; content: string };
  undone?: boolean;
  undoing?: boolean;
}

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
  changes?: Change[];
  error?: boolean;
}

const EXAMPLE =
  "nagra der udirdlagiin nogoon tovch darahad dohionii tsonh garna, chanar 60 aas doosh bol anten taaraagui";

/** Text the model sees for its own earlier turn, including what happened to each change. */
function historyText(m: Message): string {
  if (!m.changes?.length) return m.text;
  const lines = m.changes.map((c) =>
    c.undone
      ? `[Админ буцаасан: "${c.title}"]`
      : `[${c.type === "create" ? "Шинээр нэмсэн" : "Зассан"}: "${c.title}"]`
  );
  return [m.text, ...lines].join("\n");
}

/**
 * "Nandia-д заах": admins tell the assistant new facts in plain chat; the
 * server files them into the knowledge base right away (with undo here).
 */
export default function KnowledgeTeachChat({ onChanged }: { onChanged: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && messages.length > 0) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;

    const history = [
      ...messages.filter((m) => !m.error),
      { id: nextId.current++, role: "user" as const, text },
    ];
    setMessages(history);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/admin/knowledge-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map((m) => ({ role: m.role, text: historyText(m) })) }),
      });
      const data: unknown = await res.json().catch(() => null);
      const obj = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
      if (!res.ok) {
        throw new Error(typeof obj.error === "string" ? obj.error : "Алдаа гарлаа. Дахин оролдоно уу.");
      }
      const changes = Array.isArray(obj.changes) ? (obj.changes as Change[]) : [];
      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          role: "assistant",
          text: typeof obj.reply === "string" && obj.reply ? obj.reply : "Ойлголоо.",
          changes,
        },
      ]);
      if (changes.length > 0) onChanged();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          role: "assistant",
          text: err instanceof Error ? err.message : "Алдаа гарлаа. Дахин оролдоно уу.",
          error: true,
        },
      ]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function patchChange(messageId: number, index: number, patch: Partial<Change>) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && m.changes
          ? { ...m, changes: m.changes.map((c, i) => (i === index ? { ...c, ...patch } : c)) }
          : m
      )
    );
  }

  async function undo(messageId: number, index: number, change: Change) {
    patchChange(messageId, index, { undoing: true });
    const supabase = createClient();
    const { error } =
      change.type === "create"
        ? await supabase.from("assistant_knowledge").delete().eq("id", change.id)
        : await supabase
            .from("assistant_knowledge")
            .update({ title: change.previous!.title, content: change.previous!.content })
            .eq("id", change.id);
    if (error) {
      toast.error("Буцааж чадсангүй");
      patchChange(messageId, index, { undoing: false });
      return;
    }
    toast.success("Буцаалаа", { description: change.title });
    patchChange(messageId, index, { undoing: false, undone: true });
    onChanged();
  }

  function newChat() {
    if (busy) return;
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  }

  return (
    <section className="flex h-[calc(100vh-7rem)] min-h-120 flex-col overflow-hidden rounded-xl border border-neutral-300 bg-surface">
      <header className="flex items-center gap-3 bg-accent px-4 py-3 text-background">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-200 ring-2 ring-background/70">
          <NandiaAvatar size={40} />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[15px] font-semibold">Nandia-д заах</p>
          <p className="text-[12px] opacity-90">Хэлсэн зүйлийг чинь цэгцлээд шууд мэдлэгтээ нэмнэ</p>
        </div>
        <button
          type="button"
          onClick={newChat}
          title="Шинэ яриа"
          aria-label="Шинэ яриа"
          className="rounded-full p-2 hover:bg-background/15"
        >
          <MessageSquarePlus size={18} />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="pt-4 text-center text-sm text-neutral-600">
            <span className="nandia-bob mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-accent-200">
              <NandiaAvatar size={64} />
            </span>
            <p className="mt-3 text-[15px] font-medium text-foreground">Надад юм заагаарай 🥔</p>
            <p className="mt-1.5">
              Төхөөрөмжийн мэдээлэл, шинэ журам, засвараа над руу ердийн чат шиг бич. Латинаар ч болно. Би цэгцлээд
              шууд мэдлэгтээ нэмнэ.
            </p>
            <button
              type="button"
              onClick={() => setInput(EXAMPLE)}
              className="mt-4 rounded-2xl border border-neutral-300 bg-background px-3.5 py-2 text-left text-[13px] hover:border-accent hover:bg-accent-100"
            >
              Жишээ: {EXAMPLE}
            </button>
          </div>
        ) : (
          messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <p className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-accent px-3.5 py-2 text-[14px] text-background">
                  {m.text}
                </p>
              </div>
            ) : (
              <div key={m.id} className="flex items-start gap-2">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-200">
                  <NandiaAvatar size={28} />
                </span>
                <div className="min-w-0 max-w-[88%] space-y-1.5">
                  <p
                    className={cn(
                      "whitespace-pre-wrap rounded-2xl rounded-tl-sm border px-3.5 py-2 text-[14px]",
                      m.error ? "border-accent-300 bg-accent-100 text-accent-800" : "border-border bg-background"
                    )}
                  >
                    {m.text}
                  </p>
                  {m.changes?.map((c, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-[12.5px]",
                        c.undone ? "bg-neutral-200 text-neutral-500 line-through" : "bg-accent-2-100 text-accent-2-800"
                      )}
                      title={c.summary}
                    >
                      <span className="min-w-0 flex-1">
                        {c.type === "create" ? "✅ Нэмсэн: " : "✏️ Зассан: "}
                        <b>{c.title}</b>
                        {c.summary && <span className="block text-[11.5px] opacity-80">{c.summary}</span>}
                      </span>
                      {!c.undone && (
                        <button
                          type="button"
                          onClick={() => void undo(m.id, i, c)}
                          disabled={c.undoing}
                          className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium hover:bg-accent-2-200 disabled:opacity-50"
                        >
                          <Undo2 size={12} /> {c.undoing ? "..." : "Буцаах"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          )
        )}
        {busy && (
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-200">
              <NandiaAvatar size={28} />
            </span>
            <div className="inline-flex gap-1 rounded-2xl rounded-tl-sm border border-border bg-background px-3.5 py-3">
              {[0, 0.15, 0.3].map((delay) => (
                <span
                  key={delay}
                  className="nandia-dot h-1.5 w-1.5 rounded-full bg-accent"
                  style={{ animationDelay: `${delay}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="border-t border-neutral-300 px-3 py-3"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-background px-3 py-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-200">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={3}
            maxLength={8000}
            placeholder="Жишээ: 4k der ulaan tovch darahad…"
            style={{ outline: "none" }}
            className="max-h-48 min-h-16 flex-1 resize-none bg-transparent py-1 text-[14px] leading-relaxed"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Илгээх"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-background hover:bg-accent-600 disabled:opacity-40"
          >
            <SendHorizontal size={16} />
          </button>
        </div>
        <p className="mt-1.5 px-1 text-[11px] text-neutral-500">Enter — илгээх · Shift+Enter — шинэ мөр</p>
      </form>
    </section>
  );
}
