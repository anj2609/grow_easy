"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Reads the class set by the pre-hydration inline script in layout.tsx; must run
    // post-mount to avoid an SSR/client markup mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="rounded-full border border-border px-3 py-1.5 text-sm hover:bg-surface-hover transition-colors"
    >
      {isDark ? "☀️ Light" : "🌙 Dark"}
    </button>
  );
}
