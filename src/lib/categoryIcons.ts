import {
  CircleEllipsis,
  Film,
  Home,
  Info,
  Receipt,
  RefreshCw,
  RotateCcw,
  Star,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  RefreshCw,
  Wallet,
  UserCog,
  Film,
  Users,
  Star,
  Home,
  RotateCcw,
  Receipt,
  CircleEllipsis,
  Info,
};

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS);

export function getCategoryIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Info;
  return CATEGORY_ICONS[name] ?? Info;
}

export const CATEGORY_COLOR_PRESETS = [
  "#f6a06b", // accent-400 (sungalt)
  "#aebf92", // accent-2-400 (dans)
  "#c0b6a5", // neutral-400 (admin)
  "#d67f48", // accent-500 (kino)
  "#8fa073", // accent-2-500 (kollektiv)
  "#ffc6a5", // accent-300 (upoint)
  "#ccdbb2", // accent-2-300 (ger)
  "#b2622d", // accent-600 (zalruulga)
  "#a19786", // neutral-500 (noat)
  "#dcd3c4", // neutral-300 (busad)
];
