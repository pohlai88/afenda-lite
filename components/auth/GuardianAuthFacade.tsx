"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import type { GuardianAssetSet, GuardianCopy, GuardianMode, GuardianState } from "./types";
import { OwlScene } from "./OwlScene";
import { EditorialPosterCopy } from "./EditorialPosterCopy";
import { AccessVaultCard } from "./AccessVaultCard";
import { GuardianCornerPanel } from "./GuardianCornerPanel";
import { GuardianShield } from "./GuardianShield";
import { GuardianIdentityMark } from "./GuardianIdentityMark";
import { resolveGuardianEditorialCopy } from "@/lib/copy/guardian-editorial-copy";
import { cn } from "@/lib/utils";
import "./guardian-auth-facade.css";

type Props = {
  mode: GuardianMode;
  state?: GuardianState;
  assets: GuardianAssetSet;
  copy?: Partial<Record<GuardianMode, GuardianCopy>>;
  /** Replaces default editorial poster (e.g. join invitation brand panel). */
  leftPanel?: ReactNode;
  onModeChange?: (mode: GuardianMode) => void;
  /**
   * Living sky cycle (48s). Default on — toggle prefers a mode and pauses ambient.
   */
  ambient?: boolean;
  /**
   * Optional link rendered to the left of the theme toggle in the corner panel.
   * Typically an org sign-in route link.
   */
  orgLink?: ReactNode;
  children?: ReactNode;
};

const defaultCopy = resolveGuardianEditorialCopy();

export function GuardianAuthFacade({
  mode,
  state = "idle",
  assets,
  copy,
  leftPanel,
  onModeChange,
  ambient = true,
  orgLink,
  children,
}: Props) {
  const [ambientPaused, setAmbientPaused] = useState(false);
  const [typingPaused, setTypingPaused] = useState(false);

  // Track current mode via ref so the auto-cycle interval doesn't become stale
  // without mode being an interval dependency (which would restart the timer on each switch).
  const currentModeRef = useRef(mode);
  useEffect(() => { currentModeRef.current = mode; }, [mode]);

  const resolvedCopy = {
    day: { ...defaultCopy.day, ...copy?.day },
    night: { ...defaultCopy.night, ...copy?.night },
  };

  const handleModeChange = useCallback(
    (next: GuardianMode) => {
      setAmbientPaused(true);
      onModeChange?.(next);
    },
    [onModeChange],
  );

  const skyAmbient = ambient && !ambientPaused;

  // Auto-cycle: switch app theme every half sky-duration (12s = 24s / 2).
  // Uses ref so mode reads stay fresh without restarting the interval on each switch.
  // When the user clicks the toggle, ambientPaused = true → skyAmbient = false → interval clears.
  useEffect(() => {
    if (!skyAmbient) return;
    const HALF_CYCLE_MS = 12_000;
    const id = setInterval(() => {
      onModeChange?.(currentModeRef.current === "day" ? "night" : "day");
    }, HALF_CYCLE_MS);
    return () => clearInterval(id);
  }, [skyAmbient, onModeChange]); // mode intentionally excluded — read via ref

  return (
    <main
      className={cn(
        "guardian-auth",
        `guardian-auth--${mode}`,
        `guardian-auth--state-${state}`,
        skyAmbient && !typingPaused && "guardian-auth--ambient",
        ambientPaused && "guardian-auth--ambient-paused",
      )}
      data-mode={mode}
      data-state={state}
      data-ambient={skyAmbient ? "true" : "false"}
    >
      <OwlScene mode={mode} state={state} assets={assets} />

      <header className="guardian-auth__brand" aria-label="Client Declaration Portal">
        <span className="guardian-auth__brand-mark" aria-hidden="true">
          <GuardianIdentityMark mode={mode} surface="brand" />
        </span>
        <span>{resolvedCopy[mode].eyebrow}</span>
      </header>

      <section className="guardian-auth__left-panel">
        {leftPanel ?? (
          <EditorialPosterCopy copyByMode={resolvedCopy} mode={mode} />
        )}
      </section>

      <section className="guardian-auth__threshold" aria-hidden="true">
        <GuardianShield state={state} mode={mode} />
      </section>

      {/* Card-zone is a flex column: corner panel (toggle) + chamber card stacked together.
          This keeps the toggle anchored to the column — no viewport-coordinate drift. */}
      <section
        className="guardian-auth__card-zone"
        onFocusCapture={() => setTypingPaused(true)}
        onBlurCapture={() => setTypingPaused(false)}
      >
        <GuardianCornerPanel mode={mode} orgLink={orgLink} onChange={handleModeChange} />
        {children ?? <AccessVaultCard mode={mode} state={state} />}
      </section>
    </main>
  );
}
