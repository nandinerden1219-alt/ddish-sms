"use client";

import { CheckCircle2, FileSpreadsheet, UploadCloud, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";

const COLUMN_FIELDS = [
  { key: "category", label: "Category (Ангилал)" },
  { key: "title", label: "Title (Гарчиг)" },
  { key: "message", label: "Message (Мессеж)" },
  { key: "additional_info", label: "Additional Information (Нэмэлт)" },
] as const;

type FieldKey = (typeof COLUMN_FIELDS)[number]["key"];
type Mapping = Record<FieldKey, string>;

export default function ImportExcel() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Mapping>({
    category: "",
    title: "",
    message: "",
    additional_info: "",
  });
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

  function guessMapping(hdrs: string[]): Mapping {
    const lower = hdrs.map((h) => h.toLowerCase());
    function find(...keywords: string[]) {
      const idx = lower.findIndex((h) => keywords.some((k) => h.includes(k)));
      return idx >= 0 ? hdrs[idx] : "";
    }
    return {
      category: find("category", "ангилал"),
      title: find("title", "гарчиг"),
      message: find("message", "мессеж", "утга"),
      additional_info: find("additional", "нэмэлт"),
    };
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setResult(null);
    setFileName(file.name);

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    if (json.length === 0) {
      toast.error("Файлд өгөгдөл олдсонгүй");
      return;
    }

    const hdrs = Object.keys(json[0]);
    setHeaders(hdrs);
    setRows(json);
    setMapping(guessMapping(hdrs));
  }

  function updateMapping(field: FieldKey, column: string) {
    setMapping((m) => ({ ...m, [field]: column }));
  }

  async function handleImport() {
    if (!mapping.title || !mapping.message) {
      toast.error("Title болон Message баганыг заавал сонгоно уу");
      return;
    }

    setImporting(true);
    const supabase = createClient();

    const { data: existingCategories } = await supabase.from("categories").select("*");
    const categoryByName = new Map(
      (existingCategories ?? []).map((c) => [c.name.trim().toLowerCase(), c])
    );
    let maxOrder = (existingCategories ?? []).reduce(
      (max, c) => Math.max(max, c.display_order),
      0
    );

    let success = 0;
    let failed = 0;

    for (const row of rows) {
      const categoryName = mapping.category ? String(row[mapping.category] ?? "").trim() : "";
      const title = String(row[mapping.title] ?? "").trim();
      const message = String(row[mapping.message] ?? "").trim();
      const additionalInfo = mapping.additional_info
        ? String(row[mapping.additional_info] ?? "").trim()
        : "";

      if (!title || !message) {
        failed++;
        continue;
      }

      let categoryId: string | null = null;
      if (categoryName) {
        const key = categoryName.toLowerCase();
        let category = categoryByName.get(key);
        if (!category) {
          maxOrder += 1;
          const { data: newCategory, error: catError } = await supabase
            .from("categories")
            .insert({
              name: categoryName,
              slug: `${slugify(categoryName)}-${Date.now().toString(36)}`,
              display_order: maxOrder,
            })
            .select()
            .single();
          if (catError || !newCategory) {
            failed++;
            continue;
          }
          category = newCategory;
          categoryByName.set(key, category);
        }
        categoryId = category.id;
      }

      const { error } = await supabase.from("information_items").insert({
        category_id: categoryId,
        title,
        message,
        additional_info: additionalInfo || null,
      });

      if (error) failed++;
      else success++;
    }

    setImporting(false);
    setResult({ success, failed });
    if (success > 0) toast.success(`Амжилттай: ${success}`);
    if (failed > 0) toast.error(`Алдаатай: ${failed}`);
  }

  return (
    <div className="space-y-5">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-surface px-6 py-12 text-center hover:border-neutral-400">
        <UploadCloud size={28} className="text-neutral-400" />
        <p className="text-sm font-medium">{fileName ?? "Excel файл сонгох (.xlsx, .xls, .csv)"}</p>
        <p className="text-xs text-muted">Дарж эсвэл чирж оруулна уу</p>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
      </label>

      {headers.length > 0 && (
        <>
          <div className="rounded-lg border border-border bg-surface p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <FileSpreadsheet size={16} /> Багана харгалзуулах
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {COLUMN_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-500">
                    {label}
                  </label>
                  <select
                    value={mapping[key]}
                    onChange={(e) => updateMapping(key, e.target.value)}
                    className="w-full rounded-full border border-border bg-background px-3.5 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-200"
                  >
                    <option value="">— сонгоогүй —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-5">
            <h2 className="mb-3 text-sm font-semibold">Урьдчилан харах ({rows.length} мөр)</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="border-b border-border text-xs uppercase text-neutral-500">
                  <tr>
                    {headers.map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      {headers.map((h) => (
                        <td key={h} className="max-w-[200px] truncate px-3 py-2 text-neutral-600">
                          {String(row[h] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            type="button"
            onClick={handleImport}
            disabled={importing}
            className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-background hover:bg-accent-600 disabled:opacity-60"
          >
            {importing ? "Импортлож байна..." : `${rows.length} мөр импортлох`}
          </button>
        </>
      )}

      {result && (
        <div className="flex gap-4 rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 size={18} />
            <span className="text-sm font-medium">Амжилттай: {result.success}</span>
          </div>
          <div className="flex items-center gap-2 text-red-600">
            <XCircle size={18} />
            <span className="text-sm font-medium">Алдаатай: {result.failed}</span>
          </div>
        </div>
      )}
    </div>
  );
}
