"use client";

import { toast } from "sonner";
import type { InformationItem } from "@/types";
import { copyToClipboard } from "./clipboard";
import { addRecentCopy } from "./recent";
import { logUsage } from "./usage";

export type CopyKind = "main" | "additional";

/**
 * The one place that copies an item: clipboard + toast + usage log + recent
 * history. Returns true on success so callers can show "Хуулсан" state.
 */
export async function copyInformation(item: InformationItem, kind: CopyKind = "main") {
  const text = kind === "additional" ? (item.additional_info ?? "") : item.message;
  if (!text.trim()) return false;

  const ok = await copyToClipboard(text);
  if (!ok) {
    toast.error("Хуулж чадсангүй — гараар сонгож хуулна уу");
    return false;
  }

  toast.success(kind === "additional" ? "Нэмэлт мэдээллийг хууллаа" : "Хууллаа", {
    description: item.title,
  });
  logUsage(item.id, kind === "additional" ? "copy_additional" : "copy");
  addRecentCopy(item.id);
  return true;
}
