import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";

const KEY = "pulse-theme";

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  root.classList.toggle("dark", theme === "dark");
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(KEY);
      if (stored === "light_explicit") return "light";
      return "dark";
    }
    return "dark";
  });

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY);
    const next: Theme = stored === "light_explicit" ? "light" : "dark";
    setTheme(next);
    apply(next);
  }, []);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      window.localStorage.setItem(KEY, next === "light" ? "light_explicit" : "dark");
      apply(next);
      return next;
    });
  }, []);

  return { theme, toggle };
}
