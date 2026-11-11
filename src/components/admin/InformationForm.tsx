"use client";

import { ChevronDown, ChevronUp, ImagePlus, LoaderCircle, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import StorageImage from "@/components/StorageImage";
import { ACCEPTED_IMAGE_TYPES, deleteImages, uploadImage } from "@/lib/images";
import { createClient } from "@/lib/supabase/client";
import type { Category, InformationFormValues, InformationItem } from "@/types";
import Modal from "./Modal";

interface InformationFormProps {
  onClose: () => void;
  onSaved: () => void;
  categories: Category[];
  editingItem: InformationItem | null;
  /** When editing: asks the parent to delete this item (parent confirms). */
  onDelete?: () => void;
}

function emptyValues(defaultCategoryId: string): InformationFormValues {
  return {
    category_id: defaultCategoryId,
    title: "",
    message: "",
    additional_info: "",
    keywords: "",
    images: [],
    display_order: 0,
    is_popular: false,
    is_active: true,
  };
}

function initialValues(
  editingItem: InformationItem | null,
  categories: Category[]
): InformationFormValues {
  if (!editingItem) return emptyValues(categories[0]?.id ?? "");
  return {
    category_id: editingItem.category_id ?? "",
    title: editingItem.title,
    message: editingItem.message,
    additional_info: editingItem.additional_info ?? "",
    keywords: editingItem.keywords ?? "",
    images: editingItem.images ?? [],
    display_order: editingItem.display_order,
    is_popular: editingItem.is_popular,
    is_active: editingItem.is_active,
  };
}

export default function InformationForm({
  onClose,
  onSaved,
  categories,
  editingItem,
  onDelete,
}: InformationFormProps) {
  const [values, setValues] = useState<InformationFormValues>(() =>
    initialValues(editingItem, categories)
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  // Files uploaded in this session that no saved row points to yet.
  const pendingUploads = useRef<string[]>([]);

  async function addImages(files: File[]) {
    const accepted = files
      .filter((f) => ACCEPTED_IMAGE_TYPES.includes(f.type))
      // "1.jpg, 2.jpg … 10.jpg" picked together should land in step order.
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    if (accepted.length < files.length) {
      toast.error("Зөвхөн PNG, JPG, WEBP, GIF зураг оруулна");
    }
    if (accepted.length === 0) return;

    setUploading((n) => n + accepted.length);
    const results = await Promise.allSettled(accepted.map(uploadImage));
    setUploading((n) => n - accepted.length);

    const paths = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    pendingUploads.current.push(...paths);
    setValues((v) => ({ ...v, images: [...v.images, ...paths.map((path) => ({ path, name: "" }))] }));

    if (paths.length < accepted.length) {
      const reason = results.find((r) => r.status === "rejected")?.reason;
      toast.error(
        /bucket not found/i.test(String(reason?.message))
          ? "Зургийн сан үүсээгүй — supabase-migrations/2026-11-11-information-images.sql-г ажиллуулна уу"
          : "Зарим зургийг хуулахад алдаа гарлаа"
      );
    }
  }

  function moveImage(index: number, delta: -1 | 1) {
    setValues((v) => {
      const images = [...v.images];
      [images[index], images[index + delta]] = [images[index + delta], images[index]];
      return { ...v, images };
    });
  }

  function removeImage(index: number) {
    setValues((v) => ({ ...v, images: v.images.filter((_, i) => i !== index) }));
  }

  function renameImage(index: number, name: string) {
    setValues((v) => ({
      ...v,
      images: v.images.map((img, i) => (i === index ? { ...img, name } : img)),
    }));
  }

  // Screenshots can be pasted straight into the form (Ctrl+V).
  function handlePaste(e: React.ClipboardEvent) {
    const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    e.preventDefault();
    void addImages(files);
  }

  function discardAndClose() {
    void deleteImages(pendingUploads.current);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.title.trim() || !values.message.trim() || !values.category_id) {
      toast.error("Ангилал, гарчиг, мессежийг заавал бөглөнө үү");
      return;
    }
    if (uploading > 0) {
      toast.error("Зураг хуулагдаж дуусахыг хүлээнэ үү");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const payload = {
      category_id: values.category_id,
      title: values.title.trim(),
      message: values.message,
      additional_info: values.additional_info.trim() ? values.additional_info : null,
      keywords: values.keywords.trim() || null,
      display_order: values.display_order,
      is_popular: values.is_popular,
      is_active: values.is_active,
      // Leave the column out when it may not exist yet (images migration not
      // run), so editing text keeps working on older databases.
      ...(values.images.length > 0 || editingItem?.images !== undefined
        ? { images: values.images.map((img) => ({ path: img.path, name: img.name.trim() })) }
        : {}),
    };

    const { error } = editingItem
      ? await supabase.from("information_items").update(payload).eq("id", editingItem.id)
      : await supabase.from("information_items").insert(payload);

    setSaving(false);

    if (error) {
      toast.error(
        error.code === "PGRST204"
          ? "Зургийн багана үүсээгүй — supabase-migrations/2026-11-11-information-images.sql-г ажиллуулна уу"
          : "Хадгалахад алдаа гарлаа"
      );
      return;
    }

    const kept = new Set(values.images.map((img) => img.path));
    const previous = (editingItem?.images ?? []).map((img) => img.path);
    void deleteImages([...previous, ...pendingUploads.current].filter((p) => !kept.has(p)));
    pendingUploads.current = [];

    toast.success("Мэдээлэл хадгалагдлаа");
    onSaved();
    onClose();
  }

  return (
    <Modal
      open
      onClose={discardAndClose}
      title={editingItem ? "Мэдээлэл засах" : "Мэдээлэл нэмэх"}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} onPaste={handlePaste} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Ангилал *
            </label>
            <select
              value={values.category_id}
              onChange={(e) => setValues((v) => ({ ...v, category_id: e.target.value }))}
              className="w-full rounded-full border border-border bg-background px-3.5 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200"
            >
              <option value="" disabled>
                Сонгох...
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Дараалал
            </label>
            <input
              type="number"
              value={values.display_order}
              onChange={(e) =>
                setValues((v) => ({ ...v, display_order: Number(e.target.value) }))
              }
              className="w-full rounded-full border border-border bg-background px-3.5 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Гарчиг *</label>
          <input
            type="text"
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            className="w-full rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200"
            placeholder="Нэмэлт багц сунгалт"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">Мессеж утга *</label>
          <textarea
            rows={5}
            value={values.message}
            onChange={(e) => setValues((v) => ({ ...v, message: e.target.value }))}
            className="w-full rounded-sm border border-border bg-background px-3.5 py-2.75 font-mono text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200"
            placeholder={"Khan dans - ...\nhuleen awagch - ..."}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Нэмэлт мэдээлэл
          </label>
          <textarea
            rows={4}
            value={values.additional_info}
            onChange={(e) => setValues((v) => ({ ...v, additional_info: e.target.value }))}
            className="w-full rounded-sm border border-border bg-background px-3.5 py-2.75 font-mono text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Түлхүүр үгс
          </label>
          <input
            type="text"
            value={values.keywords}
            onChange={(e) => setValues((v) => ({ ...v, keywords: e.target.value }))}
            className="w-full rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200"
            placeholder="khan bank, сунгалт, ..."
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Зураг
            <span className="ml-1.5 font-normal text-neutral-500">
              алхам алхмаар · нэр нь томруулж харахад гарна · Ctrl+V-ээр буулгаж болно
            </span>
          </label>
          {values.images.length > 0 && (
            <ol className="mb-2 space-y-1.5">
              {values.images.map((img, i) => (
                <li
                  key={img.path}
                  className="flex items-center gap-2 rounded-sm border border-border bg-background p-1.5"
                >
                  <span className="w-5 shrink-0 text-center text-xs font-semibold text-neutral-500">
                    {i + 1}
                  </span>
                  <StorageImage
                    path={img.path}
                    className="h-14 w-14 shrink-0 rounded-sm border border-neutral-200 object-cover"
                  />
                  <input
                    type="text"
                    value={img.name}
                    onChange={(e) => renameImage(i, e.target.value)}
                    aria-label={`${i + 1}-р зургийн нэр`}
                    placeholder="Зургийн нэр (жишээ: Цэс рүү орох)"
                    className="min-w-0 flex-1 rounded-full border border-border bg-surface px-3.5 py-1.75 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200"
                  />
                  <button
                    type="button"
                    onClick={() => moveImage(i, -1)}
                    disabled={i === 0}
                    aria-label="Дээш шилжүүлэх"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-200 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(i, 1)}
                    disabled={i === values.images.length - 1}
                    aria-label="Доош шилжүүлэх"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-200 disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronDown size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    aria-label={`${i + 1}-р зургийг хасах`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-600 hover:bg-accent-200 hover:text-accent-800"
                  >
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ol>
          )}
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-sm border border-dashed border-neutral-400 py-3 text-sm text-neutral-600 hover:border-accent hover:bg-accent-100 hover:text-accent-800">
            {uploading > 0 ? (
              <>
                <LoaderCircle size={18} className="animate-spin" />
                {uploading} зураг хуулж байна...
              </>
            ) : (
              <>
                <ImagePlus size={18} />
                Зураг нэмэх
              </>
            )}
            <input
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              multiple
              className="sr-only"
              onChange={(e) => {
                void addImages(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <input
              type="checkbox"
              checked={values.is_popular}
              onChange={(e) => setValues((v) => ({ ...v, is_popular: e.target.checked }))}
              className="h-4 w-4 rounded border-border accent-accent"
            />
            Түгээмэл
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

        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-border pt-4">
          {editingItem && onDelete && (
            <button
              type="button"
              onClick={() => {
                void deleteImages(pendingUploads.current);
                onDelete();
              }}
              className="mr-auto inline-flex min-h-11 items-center gap-1.5 rounded-full border border-accent-300 px-4 py-2.5 text-sm font-semibold text-accent-800 hover:bg-accent-200"
            >
              <Trash2 size={15} /> Устгах
            </button>
          )}
          <button
            type="button"
            onClick={discardAndClose}
            className="min-h-11 rounded-full border border-border px-4.5 py-2.5 text-sm font-medium hover:bg-neutral-200"
          >
            Болих
          </button>
          <button
            type="submit"
            disabled={saving || uploading > 0}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-background hover:bg-accent-600 disabled:opacity-60"
          >
            {saving ? "Хадгалж байна..." : "Хадгалах"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
