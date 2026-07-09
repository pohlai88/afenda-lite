import { ReactNode } from "react";
import type { GuardianAssetSet, GuardianCopy, GuardianMode, GuardianState } from "./types";
import { OwlScene } from "./OwlScene";
import { EditorialPosterCopy } from "./EditorialPosterCopy";
import { AccessVaultCard } from "./AccessVaultCard";
import { ThemeToggle } from "./ThemeToggle";
import { GuardianShield } from "./GuardianShield";
import "./guardian-auth-facade.css";

type Props = {
  mode: GuardianMode;
  state?: GuardianState;
  assets: GuardianAssetSet;
  copy?: Partial<Record<GuardianMode, GuardianCopy>>;
  onModeChange?: (mode: GuardianMode) => void;
  children?: ReactNode;
};

const defaultCopy: Record<GuardianMode, GuardianCopy> = {
  night: {
    eyebrow: "Client Declaration Portal",
    headline: "Truth, held quietly.",
    subheadline: "Guarded for trusted declarations.",
    proofline: "Confidential. Secure. Always.",
  },
  day: {
    eyebrow: "Client Declaration Portal",
    headline: "Protected by clarity.",
    subheadline: "Guarded for trusted declarations.",
    proofline: "Secure. Confidential. Verified.",
  },
};

export function GuardianAuthFacade({
  mode,
  state = "idle",
  assets,
  copy,
  onModeChange,
  children,
}: Props) {
  const resolvedCopy = {
    day: { ...defaultCopy.day, ...copy?.day },
    night: { ...defaultCopy.night, ...copy?.night },
  };

  return (
    <main
      className={`guardian-auth guardian-auth--${mode} guardian-auth--state-${state}`}
      data-mode={mode}
      data-state={state}
    >
      <OwlScene mode={mode} state={state} assets={assets} />

      <header className="guardian-auth__brand" aria-label="Client Declaration Portal">
        <span className="guardian-auth__brand-mark" aria-hidden="true">◈</span>
        <span>{resolvedCopy[mode].eyebrow}</span>
      </header>

      <ThemeToggle mode={mode} onChange={onModeChange} />

      <section className="guardian-auth__left-panel">
        <EditorialPosterCopy copy={resolvedCopy[mode]} />
      </section>

      <section className="guardian-auth__threshold" aria-hidden="true">
        <GuardianShield state={state} mode={mode} />
      </section>

      <section className="guardian-auth__card-zone">
        {children ?? <AccessVaultCard state={state} />}
      </section>
    </main>
  );
}
