export type UsageAction = "view" | "copy" | "copy_additional";

export interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

export interface ImportRow {
  category: string;
  title: string;
  message: string;
  additional_info: string;
}
