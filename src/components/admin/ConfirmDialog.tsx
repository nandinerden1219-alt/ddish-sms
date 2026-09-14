"use client";

import { cn } from "@/lib/utils";
import Modal from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Устгах",
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} maxWidth="max-w-sm">
      <p className="text-sm leading-relaxed text-neutral-700">{description}</p>
      <div className="mt-5 flex justify-end gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-full border border-neutral-300 px-4.5 py-2.5 text-sm font-medium hover:bg-neutral-200"
        >
          Болих
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={cn(
            "min-h-11 rounded-full px-5 py-2.5 text-sm font-medium text-background",
            danger ? "bg-accent-700 hover:bg-accent-800" : "bg-accent hover:bg-accent-600"
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
