export type ThemeMode = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "time-tracker-theme";

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeMode(stored) ? stored : "system";
}

export function resolveDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Apply resolved light/dark appearance to <html>. */
export function applyTheme(mode: ThemeMode) {
  const dark = resolveDark(mode);
  const root = document.documentElement;
  // data-theme survives Next.js hydration (React only owns className on <html>).
  root.dataset.theme = dark ? "dark" : "light";
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

export function setStoredTheme(mode: ThemeMode) {
  localStorage.setItem(THEME_STORAGE_KEY, mode);
  applyTheme(mode);
}

/** Inline script applied before paint to avoid theme flash. */
export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k)||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.dataset.theme=d?"dark":"light";r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
