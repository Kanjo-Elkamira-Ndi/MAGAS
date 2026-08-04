"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={toggleTheme}
    >
      <Sun
        className={isDark ? "hidden" : "block"}
        aria-hidden="true"
        strokeWidth={1.75}
      />
      <Moon
        className={isDark ? "block" : "hidden"}
        aria-hidden="true"
        strokeWidth={1.75}
      />
    </Button>
  );
}
