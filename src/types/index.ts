export type UsageAction = "view" | "copy" | "copy_additional";

/** Top-level sidebar section that categories branch out of. */
export interface CategoryGroup {
  id: string;
  name: string;
  slug: string;
  icon: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  group_id: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsefulLink {
  id: string;
  title: string;
  url: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsefulLinkFormValues {
  title: string;
  url: string;
  description: string;
  display_order: number;
  is_active: boolean;
}

export interface CategoryGroupFormValues {
  name: string;
  slug: string;
  icon: string;
  display_order: number;
  is_active: boolean;
}

export interface InformationItem {
  id: string;
  category_id: string | null;
  title: string;
  message: string;
  additional_info: string | null;
  keywords: string | null;
  display_order: number;
  is_popular: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InformationWithStats extends InformationItem {
  copy_count: number;
  copy_additional_count: number;
  view_count: number;
}

export interface CategoryFormValues {
  name: string;
  slug: string;
  color: string;
  icon: string;
  group_id: string;
  display_order: number;
  is_active: boolean;
}

export interface InformationFormValues {
  category_id: string;
  title: string;
  message: string;
  additional_info: string;
  keywords: string;
  display_order: number;
  is_popular: boolean;
  is_active: boolean;
}

export type AnnouncementLevel = "info" | "warning" | "urgent";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  level: AnnouncementLevel;
  is_pinned: boolean;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementFormValues {
  title: string;
  body: string;
  level: AnnouncementLevel;
  is_pinned: boolean;
  is_active: boolean;
  /** Local date "YYYY-MM-DD" or "" for no expiry. */
  expires_on: string;
}

export interface ImportRow {
  category: string;
  title: string;
  message: string;
  additional_info: string;
}
