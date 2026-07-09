import type { ReactNode } from "react";
import type { GuardianMode } from "./types";
import { ThemeToggle } from "./ThemeToggle";

type Props = {
  mode: GuardianMode;
  /** Optional link/label rendered to the left of the theme toggle. */
  orgLink?: ReactNode;
  onChange?: (mode: GuardianMode) => void;
};

/**
 * Top-right utility cluster — groups an optional org sign-in link
 * with the sun/moon theme toggle in a single glass pill.
 *
 * Owns `position: absolute` so ThemeToggle can remain a button-only component.
 */
export function GuardianCornerPanel({ mode, orgLink, onChange }: Props) {
  return (
    <div className="guardian-corner-panel">
      {orgLink && (
        <span className="guardian-corner-panel__org">{orgLink}</span>
      )}
      <ThemeToggle mode={mode} onChange={onChange} />
    </div>
  );
}
