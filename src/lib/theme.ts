import { useState } from "react";

/* ---------------- tema chiaro / scuro (come Navy OS) ---------------- */
type Theme = "light" | "dark";
function readTheme(): Theme {
  try {
    const t = localStorage.getItem("habitus-theme");
    if (t === "light" || t === "dark") return t;
  } catch {
    /* storage non disponibile */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function applyTheme(t: Theme) {
  document.documentElement.classList.toggle("dark", t === "dark");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "dark" ? "#0D1411" : "#F4EFE4");
}
applyTheme(readTheme());
export function useTheme() {
  const [t, setT] = useState<Theme>(readTheme);
  const set = (n: Theme) => {
    setT(n);
    applyTheme(n);
    try {
      localStorage.setItem("habitus-theme", n);
    } catch {
      /* ok */
    }
  };
  return { theme: t, toggle: () => set(t === "dark" ? "light" : "dark") };
}

