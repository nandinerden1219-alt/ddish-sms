"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createLocalListStore } from "./localListStore";

const store = createLocalListStore("sms_dismissed_announcements");

/** Announcements this browser has closed. Purely a per-agent convenience. */
export function useDismissedAnnouncements() {
  const dismissed = useSyncExternalStore(store.subscribe, store.read, store.getServerSnapshot);

  const dismiss = useCallback((id: string) => {
    const current = store.read();
    if (!current.includes(id)) store.write([...current, id]);
  }, []);

  const restoreAll = useCallback(() => store.write([]), []);

  return { dismissed, dismiss, restoreAll };
}
