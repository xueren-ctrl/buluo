"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="coc-btn-secondary w-10 h-10 flex items-center justify-center" aria-label="切换主题">
        <span className="text-lg">⚙️</span>
      </button>
    );
  }

  const current = theme === "system" ? systemTheme : theme;
  const isDark = current === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="coc-btn-secondary w-10 h-10 flex items-center justify-center !p-0"
      aria-label={isDark ? "切换到浅色主题" : "切换到深色主题"}
      title={isDark ? "切换到浅色主题" : "切换到深色主题"}
    >
      <span className="text-lg">{isDark ? "☀️" : "🌙"}</span>
    </button>
  );
}

export default ThemeToggle;
