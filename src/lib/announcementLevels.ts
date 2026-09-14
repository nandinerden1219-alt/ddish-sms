import type { AnnouncementLevel } from "@/types";

export interface LevelStyle {
  label: string;
  /** Card container classes (border colour + tint). */
  card: string;
  /** Small pill badge classes. */
  badge: string;
  /** Accent text (icon, meta). */
  accent: string;
}

export const ANNOUNCEMENT_LEVELS: Record<AnnouncementLevel, LevelStyle> = {
  info: {
    label: "Мэдээлэл",
    card: "border-accent-2-300 bg-accent-2-100",
    badge: "bg-accent-2-200 text-accent-2-800",
    accent: "text-accent-2-700",
  },
  warning: {
    label: "Анхааруулга",
    card: "border-accent-300 bg-accent-100",
    badge: "bg-accent-200 text-accent-800",
    accent: "text-accent-700",
  },
  urgent: {
    label: "Яаралтай",
    card: "border-accent-600 bg-accent-100",
    badge: "bg-accent-700 text-background",
    accent: "text-accent-800",
  },
};

export const ANNOUNCEMENT_LEVEL_ORDER: AnnouncementLevel[] = ["info", "warning", "urgent"];
