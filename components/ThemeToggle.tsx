"use client";

import { useEffect, useState } from "react";

type ThemePref = "system" | "light" | "dark";

const LABELS: Record<ThemePref, string> = { system: "Auto", light: "Light", dark: "Dark" };
const ORDER: ThemePref[] = ["system", "light", "dark"];

function applyTheme(pref: ThemePref) {
  const html = document.documentElement;
  html.classList.remove("light", "dark");
  let resolved: "light" | "dark";
  if (pref === "system") {
    resolved = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    localStorage.removeItem("theme");
  } else {
    resolved = pref;
    localStorage.setItem("theme", pref);
  }
  html.classList.add(resolved);
}

export default function ThemeToggle({ onPersist }: { onPersist?: (pref: ThemePref) => void }) {
  const [pref, setPref] = useState<ThemePref>("system");

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") setPref(stored);
    else setPref("system");
  }, []);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
    setPref(next);
    applyTheme(next);
    onPersist?.(next);
  }

  return (
    <button
      onClick={cycle}
      title={`Theme: ${LABELS[pref]} (click to cycle)`}
      className="rounded-lg border border-border px-2.5 py-1 text-xs text-fg-muted hover:bg-surface-raised transition"
    >
      {pref === "dark" ? "🌙" : pref === "light" ? "☀️" : "⚙️"} {LABELS[pref]}
    </button>
  );
}
