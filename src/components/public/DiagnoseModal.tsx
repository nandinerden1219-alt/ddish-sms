"use client";

import { AlertTriangle, Copy, LoaderCircle, RotateCcw, Stethoscope } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Modal from "@/components/admin/Modal";
import { copyInformation } from "@/lib/copyItem";
import { cn } from "@/lib/utils";
import type { InformationItem } from "@/types";
import AnswerText, { findMentionedItems } from "./AnswerText";

const inputClass =
  "w-full rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200";
const labelClass = "mb-1.5 block text-sm font-medium text-neutral-700";

type Reading = number | null;

interface Device {
  id: string;
  /** Name as it appears in Nandia's knowledge titles, so the right section is used. */
  name: string;
  strengthLabel: string;
  qualityLabel: string;
  /** Values this device can show (mirrors the "Дохио, чанарын боломжит утга" knowledge section). */
  hint?: string;
  /** A short warning when the entered numbers are impossible for this device. */
  check?: (strength: Reading, quality: Reading) => string | null;
  /**
   * What the readings mean, from the staff's own rules. Decided in code because
   * the fast model contradicted itself on these; Nandia then explains the steps.
   */
  verdict?: (strength: Reading, quality: Reading) => string | null;
}

const outOf = (v: Reading, min: number, max: number) => v !== null && (v < min || v > max);

const THREE_O_VERDICT = (s: Reading) =>
  s === 4 ? "Дохио 4: онцгой тохиолдол, холболтын заавар өгнө." : null;

const THREE_O_CHECK = (s: Reading, q: Reading) =>
  (s !== null && s < 18 && s !== 4) || (q !== null && q < 10)
    ? "3.0, 4K-ийн дохио хамгийн багадаа 18 (онцгой үед 4), чанар хамгийн багадаа 10 байдаг."
    : null;

const DEVICES: Device[] = [
  {
    id: "konka",
    name: "Konka",
    strengthLabel: "I (дохионы хүч)",
    qualityLabel: "Q (дохионы чанар)",
    hint: "I: 11–99 · Q: 0–60 (I, Q зөвхөн Konka дээр гардаг)",
    check: (s, q) => (outOf(s, 11, 99) || outOf(q, 0, 60) ? "Konka-гийн I 11–99, Q 0–60 хооронд л заадаг." : null),
    verdict: (s, q) => {
      if (s === null) return null;
      if (s < 80) return "I 80-аас доош: кабель утас, дуран (LNB), оролтуудаа шалгана.";
      if (q === null) return null;
      if (q < 45) return "I хэвийн, Q 45-аас бага: антен тааралгүй байна, антенаа тааруулна.";
      return "I, Q хэвийн: дохио таарсан байна.";
    },
  },
  {
    id: "nagra",
    name: "Награ",
    strengthLabel: "Дохио",
    qualityLabel: "Чанар",
    hint: "Дохио: 0–100 · Чанар: 6, 7 эсвэл 100 (гацсан үед 0, 0)",
    check: (s, q) =>
      outOf(s, 0, 100) || (q !== null && ![0, 6, 7, 100].includes(q))
        ? "Награ-гийн чанар зөвхөн 6, 7 эсвэл 100 (гацсан үед 0) байдаг."
        : null,
    verdict: (s, q) => {
      if (s === 0 && q === 0) return "0, 0: төхөөрөмж гацсан байна, reset хийнэ.";
      if (q === 6 || q === 7) return `Чанар ${q}: антен тааралгүй байна, антенаа тааруулна.`;
      if (q === 100) return "Чанар 100: антен таарсан, дохио хэвийн байна.";
      return null;
    },
  },
  {
    id: "arion",
    name: "Арион",
    strengthLabel: "Дохио",
    qualityLabel: "Чанар",
    hint: "Тааралгүй үед 0, 0 · Таарвал дохио 90, чанар 50-аас дээш",
    check: (s, q) =>
      s === null || q === null || (s === 0 && q === 0) || q >= 50
        ? null
        : "Арион тааралгүй үед 0, 0, таарвал чанар 50-аас дээш л заадаг.",
    verdict: (s, q) => {
      if (s === 0 && q === 0) return "0, 0: антен тааралгүй байна, антенаа тааруулна.";
      if (q !== null && q >= 50) return "Чанар 50-аас дээш: антен таарсан, дохио хэвийн байна.";
      return null;
    },
  },
  { id: "intek", name: "Интек", strengthLabel: "Дохио", qualityLabel: "Чанар" },
  {
    id: "d30",
    name: "3.0",
    strengthLabel: "Дохио",
    qualityLabel: "Чанар",
    hint: "Энгийн үед дохио ≥ 18, чанар ≥ 10 · онцгой үед дохио 4",
    check: THREE_O_CHECK,
    verdict: THREE_O_VERDICT,
  },
  {
    id: "d4k",
    name: "4K",
    strengthLabel: "Дохио",
    qualityLabel: "Чанар",
    hint: "Энгийн үед дохио ≥ 18, чанар ≥ 10 · онцгой үед дохио 4",
    check: THREE_O_CHECK,
    verdict: THREE_O_VERDICT,
  },
];

function toReading(value: string): Reading {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** The question sent to Nandia, e.g. "Оношилгоо: Konka төхөөрөмж. I = 85, Q = 20. Нэмэлт: …". */
function buildQuestion(device: Device, strength: Reading, quality: Reading, note: string): string {
  const short = (label: string) => label.split(" ")[0];
  const readings = [
    strength !== null ? `${short(device.strengthLabel)} = ${strength}` : null,
    quality !== null ? `${short(device.qualityLabel)} = ${quality}` : null,
  ].filter(Boolean);
  // Impossible readings get no verdict; Nandia then asks to double-check the device.
  const verdict = device.check?.(strength, quality) ? null : device.verdict?.(strength, quality);
  return [
    `Оношилгоо: ${device.name} төхөөрөмж.`,
    readings.length ? `${readings.join(", ")}.` : "",
    verdict ? `Мэдлэгийн дагуу дүгнэлт: ${verdict} Энэ дүгнэлтэд тулгуурлаж хэрэглэгчид хэлэх алхмыг бич.` : "",
    note.trim() ? `Нэмэлт: ${note.trim()}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

type Status = "idle" | "loading" | "done" | "error";

interface DiagnoseModalProps {
  open: boolean;
  onClose: () => void;
  /** Used to offer a copy button for SMS templates the answer names. */
  items: InformationItem[];
}

/**
 * Quick diagnosis form: pick the device, enter its two signal readings, and
 * Nandia AI (same knowledge base and rules as the chat) answers.
 */
export default function DiagnoseModal({ open, onClose, items }: DiagnoseModalProps) {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [strength, setStrength] = useState("");
  const [quality, setQuality] = useState("");
  const [note, setNote] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const device = DEVICES.find((d) => d.id === deviceId) ?? null;
  const warning = device?.check?.(toReading(strength), toReading(quality)) ?? null;
  const verdict = warning ? null : (device?.verdict?.(toReading(strength), toReading(quality)) ?? null);

  // Stop an in-flight answer when the dialog closes or unmounts.
  useEffect(() => {
    if (!open) abortRef.current?.abort();
  }, [open]);
  useEffect(() => () => abortRef.current?.abort(), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!device) {
      setError("Эхлээд төхөөрөмжөө сонгоно уу.");
      setStatus("error");
      return;
    }
    const s = toReading(strength);
    const q = toReading(quality);
    if (s === null && q === null && !note.trim()) {
      setError("Дохио, чанар эсвэл тайлбарын аль нэгийг оруулна уу.");
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
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", text: buildQuestion(device, s, q, note) }] }),
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
    setDeviceId(null);
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
        <div>
          <p className={labelClass}>Төхөөрөмж</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Төхөөрөмж">
            {DEVICES.map((d) => (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={deviceId === d.id}
                onClick={() => setDeviceId(d.id)}
                className={cn(
                  "min-w-16 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                  deviceId === d.id
                    ? "border-accent bg-accent text-background"
                    : "border-neutral-300 bg-background hover:border-accent hover:bg-accent-100"
                )}
              >
                {d.name}
              </button>
            ))}
          </div>
          {device?.hint && (
            <p className="mt-2 text-[12.5px] text-neutral-600">
              <span className="font-medium text-neutral-700">Боломжит утга:</span> {device.hint}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="dx-strength" className={labelClass}>
              {device?.strengthLabel ?? "Дохио"}
            </label>
            <input
              id="dx-strength"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={strength}
              onChange={(e) => setStrength(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="dx-quality" className={labelClass}>
              {device?.qualityLabel ?? "Чанар"}
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

        {verdict && (
          <p className="flex items-start gap-2 rounded-sm bg-accent-2-100 px-3.5 py-2.5 text-[13px] text-accent-2-800">
            <Stethoscope size={15} className="mt-0.5 shrink-0" />
            <span>
              <b>Урьдчилсан дүгнэлт:</b> {verdict}
            </span>
          </p>
        )}

        {warning && (
          <p className="flex items-start gap-2 rounded-sm bg-accent-100 px-3.5 py-2.5 text-[13px] text-accent-800">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>
              {warning} Ажилтан тоог буруу харсан эсвэл өөр төхөөрөмж байж магадгүй. Төхөөрөмжийн загвар, харж буй
              цонхоо сайн баталгаажуулна уу.
            </span>
          </p>
        )}

        <div>
          <label htmlFor="dx-note" className={labelClass}>
            Нэмэлт <span className="font-normal text-neutral-500">(дэлгэцийн бичиг, цаг агаар, хэзээнээс…)</span>
          </label>
          <textarea
            id="dx-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Жишээ: no signal gej garaad bn, tsas orson"
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
              Nandia AI-ийн санал — хэрэглэгчид хэлэхээсээ өмнө нүдээр шалгана уу.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
