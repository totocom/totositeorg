"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

const themeListeners = new Set<() => void>();

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

function getStoredTheme() {
  try {
    const stored = localStorage.getItem("theme");

    return isTheme(stored) ? stored : null;
  } catch {
    return null;
  }
}

function getClientTheme(): Theme {
  const stored = getStoredTheme();

  if (stored) return stored;
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";

  return "light";
}

function getThemeSnapshot() {
  return typeof window === "undefined" ? "light" : getClientTheme();
}

function getServerThemeSnapshot(): Theme {
  return "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function notifyThemeListeners() {
  themeListeners.forEach((listener) => listener());
}

function setStoredTheme(theme: Theme) {
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // Keep the visible theme change even if storage is unavailable.
  }

  applyTheme(theme);
  notifyThemeListeners();
}

function subscribeTheme(listener: () => void) {
  themeListeners.add(listener);

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handlePreferenceChange = () => {
    if (!getStoredTheme()) listener();
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key === "theme") listener();
  };

  media.addEventListener("change", handlePreferenceChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    themeListeners.delete(listener);
    media.removeEventListener("change", handlePreferenceChange);
    window.removeEventListener("storage", handleStorage);
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );
  const toggle = useCallback(() => {
    setStoredTheme(theme === "light" ? "dark" : "light");
  }, [theme]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
