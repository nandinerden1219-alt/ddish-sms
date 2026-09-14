import { FileText, RefreshCw, Star, Tags } from "lucide-react";

interface DashboardCardsProps {
  totalInformation: number;
  totalCategories: number;
  totalPopular: number;
  todayUpdated: number;
}

export default function DashboardCards({
  totalInformation,
  totalCategories,
  totalPopular,
  todayUpdated,
}: DashboardCardsProps) {
  const cards = [
    { label: "Нийт мэдээлэл", value: totalInformation, icon: FileText, color: "#c67139" },
    { label: "Нийт ангилал", value: totalCategories, icon: Tags, color: "#7a8a5e" },
    { label: "Түгээмэл мэдээлэл", value: totalPopular, icon: Star, color: "#d67f48" },
    { label: "Өнөөдөр шинэчлэгдсэн", value: todayUpdated, icon: RefreshCw, color: "#728157" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="rounded-md border border-neutral-300 bg-surface p-4">
          <div
            className="mb-3 flex h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: `${color}29`, color }}
          >
            <Icon size={18} />
          </div>
          <p className="text-2xl">{value}</p>
          <p className="mt-0.5 text-xs text-muted">{label}</p>
        </div>
      ))}
    </div>
  );
}
