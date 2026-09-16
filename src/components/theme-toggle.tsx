"use client";

import { useEffect, useState } from "react";

type ThemeChoice = "light" | "dark" | "system";

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(choice: ThemeChoice) {
  const effective = choice === "system" ? (systemPrefersDark() ? "dark" : "light") : choice;
  document.documentElement.setAttribute("data-theme", effective);
}

const LABEL: Record<ThemeChoice, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};
const ICON: Record<ThemeChoice, string> = {
  light: "☀️",
  dark: "🌙",
  system: "🖥️",
};
const NEXT: Record<ThemeChoice, ThemeChoice> = {
  system: "light",
  light: "dark",
  dark: "system",
};

/** Cycles System -> Light -> Dark -> System. Persists to localStorage; "system" clears it. */
export function ThemeToggle({ className }: { className?: string }) {
  const [choice, setChoice] = useState<ThemeChoice>("system");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme");
      setChoice(stored === "light" || stored === "dark" ? stored : "system");
    } catch {
      /* localStorage unavailable — stay on "system" */
    }
  }, []);

  function cycle() {
    const next = NEXT[choice];
    setChoice(next);
    try {
      if (next === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {
      /* localStorage unavailable — still apply for this page view */
    }
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      title={`Theme: ${LABEL[choice]} (click to change)`}
      className={
        className ??
        "rounded-lg border border-border px-2 py-1.5 text-xs font-medium hover:bg-foreground/10"
      }
    >
      <span aria-hidden>{ICON[choice]}</span>{" "}
      <span className="hidden sm:inline">{LABEL[choice]}</span>
    </button>
  );
}
