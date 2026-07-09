"use client";

import { useState } from "react";
import {
  GuardianAuthFacade,
  type GuardianMode,
  type GuardianState,
} from "@/components/auth";
import { useThemeControls } from "@/components/theme-provider";
import {
  guardianModeFromPortalTheme,
  portalThemeFromGuardianMode,
} from "@/lib/guardian-editorial-copy";
import { GUARDIAN_AUTH_ASSET_SET } from "@/lib/portal-brand";
import { portalCopy } from "@/lib/portal-copy";

export type GuardianAuthFacadePreviewProps = {
  mode?: GuardianMode;
  state?: GuardianState;
};

/** Static Storybook surface — mode/state driven by args. */
export function GuardianAuthFacadePreview({
  mode = "night",
  state = "idle",
}: GuardianAuthFacadePreviewProps) {
  return (
    <GuardianAuthFacade
      mode={mode}
      state={state}
      assets={GUARDIAN_AUTH_ASSET_SET}
    />
  );
}

/** Mock Neon sign-in slot for Storybook — mirrors prod Guardian + Neon wiring. */
function MockNeonSignInSlot() {
  return (
    <div className="guardian-auth__access-panel flex w-full flex-col gap-4">
      <div className="portal-neon-view w-full">
        <div className="bg-card text-card-foreground flex w-full flex-col gap-6 rounded-xl border py-6 shadow-sm">
        <div className="grid auto-rows-min grid-rows-[auto_auto] gap-1.5 px-6">
          <div className="font-semibold text-lg md:text-xl">
            {portalCopy.signIn.title}
          </div>
          <div className="text-muted-foreground text-xs md:text-sm">
            {portalCopy.signIn.description}
          </div>
        </div>
        <div className="grid gap-4 px-6">
          <label className="grid gap-2 text-sm">
            <span className="font-medium">{portalCopy.signIn.emailLabel}</span>
            <input
              className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
              placeholder={portalCopy.signIn.emailPlaceholder}
              readOnly
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium">{portalCopy.signIn.passwordLabel}</span>
            <input
              className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
              type="password"
              readOnly
            />
          </label>
          <button
            type="button"
            className="bg-primary text-primary-foreground inline-flex h-9 w-full items-center justify-center rounded-md text-sm font-medium"
          >
            {portalCopy.signIn.submit}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}

/** Prod wiring preview — Guardian shell + mock Neon slot (AuthView not mounted in Storybook). */
export function GuardianAuthNeonSlotPreview() {
  const { resolvedTheme, setTheme } = useThemeControls();
  const mode = guardianModeFromPortalTheme(resolvedTheme);

  return (
    <GuardianAuthFacade
      mode={mode}
      onModeChange={(next) => setTheme(portalThemeFromGuardianMode(next))}
      assets={GUARDIAN_AUTH_ASSET_SET}
    >
      <MockNeonSignInSlot />
    </GuardianAuthFacade>
  );
}

/** Interactive surface — theme toggle + state dev toolbar for design review. */
const GUARDIAN_STATE_CHROME: Record<
  GuardianState,
  { label: string; active: string; idle: string }
> = {
  idle: {
    label: "idle",
    active: "rgba(127, 178, 255, .42)",
    idle: "rgba(0, 0, 0, .45)",
  },
  typing: {
    label: "typing",
    active: "rgba(214, 165, 87, .48)",
    idle: "rgba(214, 165, 87, .18)",
  },
  loading: {
    label: "loading",
    active: "rgba(127, 178, 255, .55)",
    idle: "rgba(127, 178, 255, .2)",
  },
  success: {
    label: "success",
    active: "rgba(95, 242, 163, .5)",
    idle: "rgba(95, 242, 163, .18)",
  },
  error: {
    label: "error",
    active: "rgba(255, 77, 77, .5)",
    idle: "rgba(255, 77, 77, .18)",
  },
  locked: {
    label: "locked",
    active: "rgba(127, 178, 255, .42)",
    idle: "rgba(127, 178, 255, .16)",
  },
  warning: {
    label: "warning",
    active: "rgba(255, 184, 77, .52)",
    idle: "rgba(255, 184, 77, .2)",
  },
};

export function GuardianAuthFacadeInteractive() {
  const { resolvedTheme, setTheme } = useThemeControls();
  const mode = guardianModeFromPortalTheme(resolvedTheme);
  const [state, setState] = useState<GuardianState>("idle");

  const states = Object.keys(GUARDIAN_STATE_CHROME) as GuardianState[];

  return (
    <>
      <GuardianAuthFacade
        mode={mode}
        state={state}
        onModeChange={(next) => setTheme(portalThemeFromGuardianMode(next))}
        assets={GUARDIAN_AUTH_ASSET_SET}
      />

      <div
        aria-label="Guardian state preview controls"
        style={{
          position: "fixed",
          bottom: 16,
          left: 16,
          zIndex: 30,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          maxWidth: "min(100vw - 32px, 520px)",
        }}
      >
        {states.map((nextState) => {
          const chrome = GUARDIAN_STATE_CHROME[nextState];
          const isActive = state === nextState;

          return (
            <button
              key={nextState}
              type="button"
              aria-pressed={isActive}
              onClick={() => setState(nextState)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: `1px solid ${isActive ? "rgba(255,255,255,.35)" : "rgba(255,255,255,.18)"}`,
                background: isActive ? chrome.active : chrome.idle,
                color: "#f4f7ff",
                font: "inherit",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {chrome.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
