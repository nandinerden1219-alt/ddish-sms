import { FileText, Megaphone, RefreshCw, Star, Tags } from "lucide-react";
import Link from "next/link";

interface DashboardCardsProps {
  totalInformation: number;
  totalCategories: number;
  totalPopular: number;
  todayUpdated: number;
  activeAnnouncements: number;
}

export default function DashboardCards({
  totalInformation,
  totalCategories,
  totalPopular,
  todayUpdated,
  activeAnnouncements,
}: DashboardCardsProps) {
  const cards = [
    { label: "Нийт мэдээлэл", value: totalInformation, icon: FileText, color: "#c67139", href: "/admin/information" },
    { label: "Нийт ангилал", value: totalCategories, icon: Tags, color: "#7a8a5e", href: "/admin/categories" },
    { label: "Түгээмэл мэдээлэл", value: totalPopular, icon: Star, color: "#d67f48", href: "/admin/popular" },
    { label: "Идэвхтэй мэдэгдэл", value: activeAnnouncements, icon: Megaphone, color: "#8c491a", href: "/admin/announcements" },
    { label: "Өнөөдөр шинэчлэгдсэн", value: todayUpdated, icon: RefreshCw, color: "#728157", href: "/admin/information" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
      {cards.map(({ label, value, icon: Icon, color, href }) => (
        <Link
          key={label}
          href={href}
          className="rounded-md border border-neutral-300 bg-surface p-4 transition-shadow hover:shadow-md"
        >
          <div
            className="mb-3 flex h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: `${color}29`, color }}
          >
            <Icon size={18} />
          </div>
          <p className="text-2xl">{value}</p>
          <p className="mt-0.5 text-xs text-muted">{label}</p>
        </Link>
      ))}
    </div>
  );
}
