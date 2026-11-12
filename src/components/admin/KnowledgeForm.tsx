"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { AssistantKnowledge, AssistantKnowledgeFormValues } from "@/types";
import Modal from "./Modal";

interface KnowledgeFormProps {
  onClose: () => void;
  onSaved: () => void;
  editing: AssistantKnowledge | null;
  nextOrder: number;
}

function initialValues(editing: AssistantKnowledge | null, nextOrder: number): AssistantKnowledgeFormValues {
  if (!editing) return { title: "", content: "", display_order: nextOrder, is_active: true };
  return {
    title: editing.title,
    content: editing.content,
    display_order: editing.display_order,
    is_active: editing.is_active,
  };
}

const inputClass =
  "w-full rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200";

const CONTENT_PLACEHOLDER = `Жишээ нь:
- Хүч, чанарыг харах: Цэс → Тохиргоо → Дохионы мэдээлэл
- Хэвийн чанар: … %-иас дээш
- Чанар … %-иас доош бол антен хөдөлгөнө
- Reset хийх алхам: 1) … 2) …
- Түгээмэл алдаа: "…" гэж гарвал → …`;

export default function KnowledgeForm({ onClose, onSaved, editing, nextOrder }: KnowledgeFormProps) {
  const [values, setValues] = useState(() => initialValues(editing, nextOrder));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.title.trim()) {
      toast.error("Гарчгийг бөглөнө үү");
      return;
    }
    if (!values.content.trim()) {
      toast.error("Мэдлэгээ бичнэ үү");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const payload = {
      title: values.title.trim(),
      content: values.content.trim(),
      display_order: values.display_order,
      is_active: values.is_active,
    };
    const { error } = editing
      ? await supabase.from("assistant_knowledge").update(payload).eq("id", editing.id)
      : await supabase.from("assistant_knowledge").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Хадгалахад алдаа гарлаа");
      return;
    }
    toast.success("Мэдлэг хадгалагдлаа");
    onSaved();
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={editing ? "Мэдлэг засах" : "Мэдлэг нэмэх"} maxWidth="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="kn-title" className="mb-1.5 block text-sm font-medium text-neutral-700">
            Гарчиг *
          </label>
          <input
            id="kn-title"
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            className={inputClass}
            placeholder="Жишээ: Награ төхөөрөмж — дохио, reset"
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="kn-content" className="mb-1.5 block text-sm font-medium text-neutral-700">
            Мэдлэг *{" "}
            <span className="font-normal text-neutral-500">
              (чөлөөтэй бичнэ — тоо, алхам, цэсний замыг аль болох тодорхой)
            </span>
          </label>
          <textarea
            id="kn-content"
            value={values.content}
            onChange={(e) => setValues((v) => ({ ...v, content: e.target.value }))}
            rows={16}
            placeholder={CONTENT_PLACEHOLDER}
            className="w-full rounded-sm border border-border bg-background px-3.5 py-2.75 text-sm leading-relaxed outline-none focus:border-accent focus:ring-2 focus:ring-accent-200"
          />
          <p className="mt-1 text-xs text-neutral-500">{values.content.length.toLocaleString("en-US")} тэмдэгт</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="kn-order" className="mb-1.5 block text-sm font-medium text-neutral-700">
              Дараалал
            </label>
            <input
              id="kn-order"
              type="number"
              value={values.display_order}
              onChange={(e) => setValues((v) => ({ ...v, display_order: Number(e.target.value) }))}
              className={inputClass}
            />
          </div>
          <div className="flex items-end pb-2.5">
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
              <input
                type="checkbox"
                checked={values.is_active}
                onChange={(e) => setValues((v) => ({ ...v, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-border accent-accent"
              />
              AI ашиглана (идэвхтэй)
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
            {saving ? "Хадгалж байна..." : "Хадгалах"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
