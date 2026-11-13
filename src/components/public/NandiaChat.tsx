"use client";

import {
  Copy,
  MessageSquarePlus,
  RotateCcw,
  SendHorizontal,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";
import { copyInformation } from "@/lib/copyItem";
import type { InformationItem } from "@/types";
import AnswerText, { findMentionedItems } from "./AnswerText";
import NandiaAvatar from "./NandiaAvatar";

const EXAMPLES = [
  "Награ, дохио 0 чанар 0, цас орсон",
  "4K төхөөрөмж reset яаж хийх вэ?",
  "Дохио хэвийн ч зураг гарахгүй байна",
];

const GREETED_KEY = "nandia-greeted";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
  status?: "streaming" | "done" | "error";
  error?: string;
}

/**
 * Nandia AI chatbot: a floating mascot button (bottom-right) that pops open a
 * chat window. The conversation survives closing and reopening the window.
 */
export default function NandiaChat({ items }: { items: InformationItem[] }) {
  const [open, setOpen] = useState(false);
  const [greeting, setGreeting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const nextId = useRef(1);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // A one-time "hi" bubble next to the mascot, once per browser session.
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(GREETED_KEY) === "1";
    } catch {
      // Storage blocked: just show the greeting.
    }
    if (seen) return;
    // Mark as greeted only once it is actually shown, so a re-run of this
    // effect (React dev double-invoke) doesn't skip it.
    const show = setTimeout(() => {
      setGreeting(true);
      try {
        sessionStorage.setItem(GREETED_KEY, "1");
      } catch {
        // ignore
      }
    }, 1200);
    const hide = setTimeout(() => setGreeting(false), 7000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Follow the answer as it streams in (the empty welcome screen stays at the top).
  useEffect(() => {
    const el = scrollRef.current;
    if (el && messages.length > 0) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  function updateMessage(id: number, patch: Partial<Message>) {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );
  }

  /** Asks again after a failed answer: drops that question and its failed reply, then resends it. */
  function retry(answerId: number) {
    if (busy) return;
    const answerIndex = messages.findIndex((m) => m.id === answerId);
    const questionIndex = messages
      .slice(0, answerIndex)
      .findLastIndex((m) => m.role === "user");
    if (questionIndex < 0) return;
    void send(messages[questionIndex].text, messages.slice(0, questionIndex));
  }

  async function send(raw: string, base: Message[] = messages) {
    const text = raw.trim();
    if (!text || busy) return;

    const userMessage: Message = { id: nextId.current++, role: "user", text };
    // Failed answers are not part of the conversation the model sees.
    const history = [...base.filter((m) => m.status !== "error"), userMessage];
    const answerId = nextId.current++;
    setMessages([
      ...history,
      { id: answerId, role: "assistant", text: "", status: "streaming" },
    ]);
    setInput("");
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let answer = "";
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, text: t }) => ({ role, text: t })),
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data: unknown = await res.json().catch(() => null);
        throw new Error(
          data &&
            typeof data === "object" &&
            "error" in data &&
            typeof data.error === "string"
            ? data.error
            : "Алдаа гарлаа. Дахин оролдоно уу.",
        );
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        updateMessage(answerId, { text: answer });
      }
      answer += decoder.decode();
      updateMessage(answerId, { text: answer, status: "done" });
    } catch (err) {
      if (controller.signal.aborted) return;
      updateMessage(answerId, {
        status: "error",
        error: answer
          ? "Хариулт дундаа тасарлаа. Дахин асууна уу."
          : err instanceof Error
            ? err.message
            : "Алдаа гарлаа. Дахин оролдоно уу.",
      });
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setBusy(false);
      }
    }
  }

  function newChat() {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  }

  async function copyAnswer(text: string) {
    if (await copyToClipboard(text.replace(/\*/g, "")))
      toast.success("Хариултыг хууллаа");
    else toast.error("Хуулж чадсангүй — гараар сонгож хуулна уу");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(input);
    }
  }

  return (
    <>
      {open && (
        <section
          aria-label="Nandia AI"
          className="nandia-pop fixed right-5 bottom-24 z-40 flex h-[min(580px,calc(100vh-8rem))] w-[min(400px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-neutral-300 bg-surface shadow-2xl"
        >
          <header className="flex items-center gap-3 bg-accent px-4 py-3 text-background">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-200 ring-2 ring-background/70">
              <NandiaAvatar size={40} />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="font-heading text-[17px]">Nandia AI</p>
              <p className="flex items-center gap-1.5 text-[12px] opacity-90">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-2-300" />{" "}
                ДДэш-ийн туслах · онлайн
              </p>
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
            <button
              type="button"
              onClick={() => setOpen(false)}
              title="Хаах (Esc)"
              aria-label="Хаах"
              className="rounded-full p-2 hover:bg-background/15"
            >
              <X size={18} />
            </button>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
            aria-live="polite"
          >
            {messages.length === 0 ? (
              <div className="pt-3 text-center">
                <span className="nandia-bob mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-accent-200">
                  <NandiaAvatar size={80} />
                </span>
                <p className="mt-3 text-[15px] font-medium">
                  Сайн уу! Би Nandia AI 👋
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  Төхөөрөмж, дохио, антен, сунгалт — асуу. Латинаар ч болно.
                </p>
                <div className="mt-4 flex flex-col items-center gap-2">
                  {EXAMPLES.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => void send(example)}
                      className="rounded-full border border-neutral-300 bg-background px-3.5 py-1.5 text-[13px] hover:border-accent hover:bg-accent-100"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="flex justify-end">
                    <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-accent px-3.5 py-2 text-[14px] text-background">
                      {m.text}
                    </p>
                  </div>
                ) : (
                  <AssistantMessage
                    key={m.id}
                    message={m}
                    items={items}
                    onCopy={copyAnswer}
                    onRetry={() => retry(m.id)}
                  />
                ),
              )
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
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={4000}
                placeholder="Асуултаа бичнэ үү…"
                // The wrapper shows the focus ring; the global :focus-visible outline would double it.
                style={{ outline: "none" }}
                className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-[14px] leading-relaxed"
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
            <p className="mt-1.5 px-1 text-[11px] text-neutral-500">
              AI алдаж болно — хэрэглэгчид хэлэхээсээ өмнө шалгаарай.
            </p>
          </form>
        </section>
      )}

      <div className="fixed right-5 bottom-5 z-40 flex items-center gap-3">
        {greeting && !open && (
          <button
            type="button"
            onClick={() => {
              setGreeting(false);
              setOpen(true);
            }}
            className="animate-fade-in rounded-2xl rounded-br-sm border border-neutral-300 bg-surface px-3.5 py-2 text-[13.5px] shadow-lg"
          >
            Асуух юм байна уу? 👋
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setGreeting(false);
            setOpen((v) => !v);
          }}
          aria-label={open ? "Nandia AI-г хаах" : "Nandia AI-аас асуух"}
          title="Nandia AI"
          className="nandia-bob relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-accent-200 shadow-xl ring-4 ring-background transition-transform hover:scale-105"
        >
          <NandiaAvatar size={64} />
          {open && (
            <span className="absolute inset-0 flex items-center justify-center bg-foreground/45 text-background">
              <X size={24} />
            </span>
          )}
        </button>
      </div>
    </>
  );
}

function AssistantMessage({
  message,
  items,
  onCopy,
  onRetry,
}: {
  message: Message;
  items: InformationItem[];
  onCopy: (text: string) => void;
  onRetry: () => void;
}) {
  const suggested =
    message.status === "done" ? findMentionedItems(items, message.text) : [];

  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-200">
        <NandiaAvatar size={28} />
      </span>
      <div className="min-w-0 max-w-[85%]">
        {message.text ? (
          <div className="space-y-1 rounded-2xl rounded-tl-sm border border-border bg-background px-3.5 py-2.5 text-[14px] leading-relaxed">
            <AnswerText text={message.text} />
          </div>
        ) : (
          message.status === "streaming" && (
            <div
              className="inline-flex gap-1 rounded-2xl rounded-tl-sm border border-border bg-background px-3.5 py-3"
              aria-label="Бичиж байна"
            >
              {[0, 0.15, 0.3].map((delay) => (
                <span
                  key={delay}
                  className="nandia-dot h-1.5 w-1.5 rounded-full bg-accent"
                  style={{ animationDelay: `${delay}s` }}
                />
              ))}
            </div>
          )
        )}
        {message.status === "error" && (
          <div className="mt-1.5 flex items-center gap-2 rounded-lg bg-accent-100 px-3 py-2 text-[13px] text-accent-800">
            <span className="min-w-0 flex-1">{message.error}</span>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[12px] font-medium text-background hover:bg-accent-600"
            >
              <RotateCcw size={12} /> Дахин асуух
            </button>
          </div>
        )}

        {suggested.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {suggested.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5"
              >
                <span className="min-w-0 flex-1 truncate text-[13px]">
                  SMS: {item.title}
                </span>
                <button
                  type="button"
                  onClick={() => void copyInformation(item, "main")}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-3 py-1 text-[12px] font-medium text-background hover:bg-accent-600"
                >
                  <Copy size={12} /> Хуулах
                </button>
              </div>
            ))}
          </div>
        )}

        {message.status === "done" && message.text && (
          <button
            type="button"
            onClick={() => onCopy(message.text)}
            className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] text-neutral-500 hover:bg-neutral-200 hover:text-foreground"
          >
            <Copy size={11} /> Хариултыг хуулах
          </button>
        )}
      </div>
    </div>
  );
}
