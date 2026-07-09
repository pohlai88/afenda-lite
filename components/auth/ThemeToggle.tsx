"use client";

import type { GuardianMode } from "./types";

type Props = {
  mode: GuardianMode;
  onChange?: (mode: GuardianMode) => void;
};

export function ThemeToggle({ mode, onChange }: Props) {
  const nextMode: GuardianMode = mode === "night" ? "day" : "night";

  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label={`Prefer ${nextMode} sky (pauses ambient cycle)`}
      title={`Prefer ${nextMode} — pauses the living sky cycle`}
      onClick={() => onChange?.(nextMode)}
    >
      <span aria-hidden="true">{mode === "night" ? "☾" : "☼"}</span>
    </button>
  );
}
