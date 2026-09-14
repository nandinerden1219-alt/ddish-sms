"use client";

import { useCallback, useSyncExternalStore } from "react";
import { createLocalListStore } from "./localListStore";

const store = createLocalListStore("sms_favorites");

export function useFavorites() {
  const favorites = useSyncExternalStore(store.subscribe, store.read, store.getServerSnapshot);

  const toggleFavorite = useCallback((id: string) => {
    const current = store.read();
    store.write(current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }, []);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}
