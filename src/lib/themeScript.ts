export const THEME_STORAGE_KEY = "sms_theme";

/**
 * Runs before paint (inlined in <head>) so the stored / system theme is
 * applied without a light flash. Server-safe: no client-only imports.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k="${THEME_STORAGE_KEY}";var s=localStorage.getItem(k);var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=d?"dark":"light";}catch(e){}})();`;
