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
      aria-label={`Switch to ${nextMode} mode`}
      onClick={() => onChange?.(nextMode)}
    >
      <span aria-hidden="true">{mode === "night" ? "☾" : "☼"}</span>
    </button>
  );
}
