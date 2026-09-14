"use client";

import { useSyncExternalStore } from "react";
import { createLocalListStore } from "./localListStore";

const store = createLocalListStore("sms_recent_copies");
const MAX_RECENT = 8;

export function addRecentCopy(id: string) {
  const current = store.read();
  store.write([id, ...current.filter((x) => x !== id)].slice(0, MAX_RECENT));
}

export function clearRecentCopies() {
  store.write([]);
}

export function useRecentCopies(): string[] {
  return useSyncExternalStore(store.subscribe, store.read, store.getServerSnapshot);
}
