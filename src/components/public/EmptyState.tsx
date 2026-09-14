import { SearchX } from "lucide-react";

interface EmptyStateProps {
  message?: string;
  hint?: string;
}

export default function EmptyState({
  message = "Мэдээлэл олдсонгүй",
  hint = "Өөр үгээр хайж үзнэ үү, эсвэл ангиллаас сонгоно уу.",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-400 py-13.5 text-center text-neutral-700">
      <SearchX size={34} className="mb-3 text-neutral-500" />
      <p className="font-heading text-[19px] text-foreground">{message}</p>
      <p className="mt-1.5 text-sm">{hint}</p>
    </div>
  );
}
