"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ANNOUNCEMENT_LEVEL_ORDER, ANNOUNCEMENT_LEVELS } from "@/lib/announcementLevels";
import { createClient } from "@/lib/supabase/client";
import { cn, endOfDayIso, toDateInputValue } from "@/lib/utils";
import type { Announcement, AnnouncementFormValues, AnnouncementLevel } from "@/types";
import Modal from "./Modal";

interface AnnouncementFormProps {
  onClose: () => void;
  onSaved: () => void;
  editing: Announcement | null;
}

function initialValues(editing: Announcement | null): AnnouncementFormValues {
  if (!editing) {
    return { title: "", body: "", level: "info", is_pinned: false, is_active: true, expires_on: "" };
  }
  return {
    title: editing.title,
    body: editing.body,
    level: editing.level,
    is_pinned: editing.is_pinned,
    is_active: editing.is_active,
    expires_on: toDateInputValue(editing.expires_at),
  };
}

const inputClass =
  "w-full rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200";

export default function AnnouncementForm({ onClose, onSaved, editing }: AnnouncementFormProps) {
  const [values, setValues] = useState<AnnouncementFormValues>(() => initialValues(editing));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.title.trim() || !values.body.trim()) {
      toast.error("Гарчиг болон агуулгыг бөглөнө үү");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const payload = {
      title: values.title.trim(),
      body: values.body.trim(),
      level: values.level,
      is_pinned: values.is_pinned,
      is_active: values.is_active,
      expires_at: endOfDayIso(values.expires_on),
    };

    const { error } = editing
      ? await supabase.from("announcements").update(payload).eq("id", editing.id)
      : await supabase.from("announcements").insert(payload);

    setSaving(false);
    if (error) {
      toast.error("Хадгалахад алдаа гарлаа");
      return;
    }
    toast.success(editing ? "Мэдэгдэл шинэчлэгдлээ" : "Мэдэгдэл нийтлэгдлээ");
    onSaved();
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={editing ? "Мэдэгдэл засах" : "Шинэ мэдэгдэл"} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Гарчиг *</label>
          <input
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            className={inputClass}
            placeholder="Жишээ: Банкны шилжүүлэг өнөөдөр саатаж болзошгүй"
            autoFocus
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Агуулга *</label>
          <textarea
            rows={6}
            value={values.body}
            onChange={(e) => setValues((v) => ({ ...v, body: e.target.value }))}
            className="w-full rounded-sm border border-border bg-background px-3.5 py-2.75 text-sm leading-relaxed outline-none focus:border-accent focus:ring-2 focus:ring-accent-200"
            placeholder={"Ажилтнуудад хэлэх зүйл…\nХэрэглэгч рүү илгээх бэлэн хариу байвал энд оруулбал агентууд шууд хуулж авна."}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Түвшин</label>
          <div className="flex flex-wrap gap-2">
            {ANNOUNCEMENT_LEVEL_ORDER.map((level: AnnouncementLevel) => {
              const style = ANNOUNCEMENT_LEVELS[level];
              const active = values.level === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setValues((v) => ({ ...v, level }))}
                  className={cn(
                    "rounded-full border px-3.5 py-1.75 text-[13px] font-semibold transition-colors",
                    active ? cn("border-transparent", style.badge) : "border-neutral-300 text-neutral-700 hover:bg-neutral-200"
                  )}
                >
                  {style.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Дуусах өдөр <span className="font-normal text-neutral-500">(заавал биш)</span>
            </label>
            <input
              type="date"
              value={values.expires_on}
              onChange={(e) => setValues((v) => ({ ...v, expires_on: e.target.value }))}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-neutral-500">Энэ өдрөөс хойш нүүр хуудаснаас автоматаар алга болно.</p>
          </div>
          <div className="flex flex-col justify-end gap-2.5 pb-1">
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
              <input
                type="checkbox"
                checked={values.is_pinned}
                onChange={(e) => setValues((v) => ({ ...v, is_pinned: e.target.checked }))}
                className="h-4 w-4 rounded border-border accent-accent"
              />
              Дээр нь тогтоох
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
              <input
                type="checkbox"
                checked={values.is_active}
                onChange={(e) => setValues((v) => ({ ...v, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-border accent-accent"
              />
              Нийтэд харагдана
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full border border-border px-4.5 py-2.5 text-sm font-medium hover:bg-neutral-200"
          >
            Болих
          </button>
          <button
            type="submit"
            disabled={saving}
            className="min-h-11 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-background hover:bg-accent-600 disabled:opacity-60"
          >
            {saving ? "Хадгалж байна..." : editing ? "Хадгалах" : "Нийтлэх"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
