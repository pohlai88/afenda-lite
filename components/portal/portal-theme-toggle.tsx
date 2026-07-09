"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useThemeControls } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

export function PortalThemeToggle() {
  const { resolvedTheme, setTheme } = useThemeControls();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="relative touch-manipulation"
      aria-label={
        resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <SunIcon className="size-4 scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90" />
      <MoonIcon className="absolute size-4 scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0" />
    </Button>
  );
}
