"use client";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import type { UsageAction } from "@/types";

/** Fire-and-forget usage log. Never throws — tracking must not break copying. */
export function logUsage(informationId: string, action: UsageAction) {
  if (!isSupabaseConfigured) return;
  try {
    const supabase = createClient();
    void supabase
      .from("information_usage")
      .insert({ information_id: informationId, action })
      .then(
        () => {},
        () => {}
      );
  } catch {
    // ignore
  }
}
