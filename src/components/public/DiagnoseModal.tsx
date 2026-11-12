"use client";

import { Copy, LoaderCircle, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Modal from "@/components/admin/Modal";
import { copyInformation } from "@/lib/copyItem";
import type { InformationItem } from "@/types";
import AnswerText, { findMentionedItems } from "./AnswerText";

const inputClass =
  "w-full rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200";
const labelClass = "mb-1.5 block text-sm font-medium text-neutral-700";

/** Receiver models that have reset guides on the site; free text is still allowed. */
const KNOWN_MODELS = ["3.0", "4K", "Награ", "Arion", "Konka"];

type Status = "idle" | "loading" | "done" | "error";

interface DiagnoseModalProps {
  open: boolean;
  onClose: () => void;
  /** Used to offer a copy button for SMS templates the answer names. */
  items: InformationItem[];
}

export default function DiagnoseModal({ open, onClose, items }: DiagnoseModalProps) {
  const [model, setModel] = useState("");
  const [strength, setStrength] = useState("");
  const [quality, setQuality] = useState("");
  const [note, setNote] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // Stop an in-flight answer when the dialog closes or unmounts.
  useEffect(() => {
    if (!open) abortRef.current?.abort();
  }, [open]);
  useEffect(() => () => abortRef.current?.abort(), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!strength && !quality && !note.trim()) {
      setError("Дохионы хүч, чанар эсвэл тайлбарын аль нэгийг оруулна уу.");
      setStatus("error");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setAnswer("");
    setError("");
    setStatus("loading");

    let text = "";
    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, strength, quality, note }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const data: unknown = await res.json().catch(() => null);
        const message =
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : "Алдаа гарлаа. Дахин оролдоно уу.";
        throw new Error(message);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setAnswer(text);
      }
      text += decoder.decode();
      setAnswer(text);
      setStatus("done");
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(
        text
          ? "Хариулт дундаа тасарлаа. Дахин оролдоно уу."
          : err instanceof Error
            ? err.message
            : "Алдаа гарлаа. Дахин оролдоно уу."
      );
      setStatus("error");
    }
  }

  function handleReset() {
    abortRef.current?.abort();
    setModel("");
    setStrength("");
    setQuality("");
    setNote("");
    setAnswer("");
    setError("");
    setStatus("idle");
  }

  const loading = status === "loading";
  const suggested = status === "done" ? findMentionedItems(items, answer) : [];

  return (
    <Modal open={open} onClose={onClose} title="Антен оношилгоо" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <label htmlFor="dx-model" className={labelClass}>
              Төхөөрөмжийн загвар
            </label>
            <input
              id="dx-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Сонгох эсвэл бичих"
              list="dx-models"
              maxLength={100}
              className={inputClass}
            />
            <datalist id="dx-models">
              {KNOWN_MODELS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="dx-strength" className={labelClass}>
              Дохионы хүч %
            </label>
            <input
              id="dx-strength"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={strength}
              onChange={(e) => setStrength(e.target.value)}
              autoFocus
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="dx-quality" className={labelClass}>
              Дохионы чанар %
            </label>
            <input
              id="dx-quality"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="dx-note" className={labelClass}>
            Нэмэлт <span className="font-normal text-neutral-500">(дэлгэцийн мессеж, цаг агаар, хэзээнээс…)</span>
          </label>
          <textarea
            id="dx-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Жишээ: tsas orson, oroi bolgon taslaad bn"
            className="w-full rounded-sm border border-border bg-background px-3.5 py-2.75 text-sm leading-relaxed outline-none focus:border-accent focus:ring-2 focus:ring-accent-200"
          />
        </div>

        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4.5 py-2.5 text-sm font-medium hover:bg-neutral-200"
          >
            <RotateCcw size={15} /> Шинээр
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-background hover:bg-accent-600 disabled:opacity-60"
          >
            {loading && <LoaderCircle size={15} className="animate-spin" />}
            {loading ? "Шинжилж байна..." : "Оношлох"}
          </button>
        </div>
      </form>

      {(answer || loading || status === "error") && (
        <div className="mt-5 border-t border-border pt-5" aria-live="polite">
          {status === "error" && (
            <p className="mb-3 rounded-sm bg-accent-100 px-3.5 py-2.5 text-sm text-accent-800">{error}</p>
          )}
          {loading && !answer && (
            <p className="flex items-center gap-2 text-sm text-neutral-600">
              <LoaderCircle size={15} className="animate-spin" /> Хариулт бэлдэж байна...
            </p>
          )}
          {answer && (
            <div className="space-y-1 rounded-md border border-border bg-background px-4 py-3.5 text-[14.5px] leading-relaxed">
              <AnswerText text={answer} />
            </div>
          )}

          {suggested.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-neutral-700">Илгээх SMS заавар</p>
              {suggested.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-md border border-border bg-surface px-3.5 py-2.5"
                >
                  <span className="min-w-0 flex-1 truncate text-sm">{item.title}</span>
                  <button
                    type="button"
                    onClick={() => void copyInformation(item, "main")}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-medium text-background hover:bg-accent-600"
                  >
                    <Copy size={13} /> Хуулах
                  </button>
                </div>
              ))}
            </div>
          )}

          {status === "done" && (
            <p className="mt-3 text-[12px] text-neutral-500">
              AI-ийн санал (Gemini 3.5 Flash-Lite) — хэрэглэгчид хэлэхээсээ өмнө нүдээр шалгана уу.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
