"use client";

/**
 * A tiny localStorage-backed list of ids that works with
 * useSyncExternalStore. Snapshots are cached by the raw stored string so
 * React only sees a new array reference when the value really changed.
 */
export function createLocalListStore(storageKey: string) {
  const listeners = new Set<() => void>();
  const EMPTY: string[] = [];
  let cachedRaw: string | null = null;
  let cached: string[] = EMPTY;

  function read(): string[] {
    if (typeof window === "undefined") return EMPTY;
    let raw: string | null;
    try {
      raw = window.localStorage.getItem(storageKey);
    } catch {
      return cached;
    }
    if (raw === cachedRaw) return cached;
    cachedRaw = raw;
    try {
      cached = raw ? (JSON.parse(raw) as string[]) : EMPTY;
    } catch {
      cached = EMPTY;
    }
    return cached;
  }

  function write(next: string[]) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // localStorage unavailable (private mode, etc.) — ignore
    }
    listeners.forEach((listener) => listener());
  }

  function subscribe(callback: () => void) {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  }

  function getServerSnapshot(): string[] {
    return EMPTY;
  }

  return { read, write, subscribe, getServerSnapshot };
}
