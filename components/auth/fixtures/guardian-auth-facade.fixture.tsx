"use client";

import { useEffect, useState } from "react";
import {
  GuardianAuthFacade,
  GuardianIdentityMark,
  type GuardianMode,
  type GuardianState,
} from "@/components/auth";
import { useThemeControls } from "@/components/theme-provider";
import {
  guardianModeFromPortalTheme,
  portalThemeFromGuardianMode,
} from "@/lib/copy/guardian-editorial-copy";
import { GUARDIAN_AUTH_ASSET_SET } from "@/lib/copy/portal-brand";
import { portalCopy } from "@/lib/copy/portal-copy";

export type GuardianAuthFacadePreviewProps = {
  mode?: GuardianMode;
  state?: GuardianState;
};

/** Static Storybook surface — theme toggle wired like production. */
export function GuardianAuthFacadePreview({
  mode: modeArg,
  state = "idle",
}: GuardianAuthFacadePreviewProps) {
  const { resolvedTheme, setTheme } = useThemeControls();
  const mode = guardianModeFromPortalTheme(resolvedTheme);

  useEffect(() => {
    if (modeArg != null) {
      setTheme(portalThemeFromGuardianMode(modeArg));
    }
  }, [modeArg, setTheme]);

  return (
    <GuardianAuthFacade
      mode={mode}
      state={state}
      onModeChange={(next) => setTheme(portalThemeFromGuardianMode(next))}
      assets={GUARDIAN_AUTH_ASSET_SET}
    />
  );
}

/** Mock Neon sign-in slot — credentials + magic link + Google (manifest social). */
function MockNeonSignInSlot({ mode }: { mode: GuardianMode }) {
  return (
    <div className="guardian-auth__access-panel flex w-full flex-col gap-3">
      <div className="portal-neon-view w-full">
        {/* No rounded-xl/shadow-sm — Guardian CSS owns chamber radius/shadow */}
        <div className="bg-card text-card-foreground flex w-full flex-col gap-4 border py-5">
          <div className="access-vault__emblem mx-auto" aria-hidden="true">
            <GuardianIdentityMark mode={mode} surface="emblem" />
          </div>
          <div className="grid auto-rows-min grid-rows-[auto_auto] gap-1 px-6 text-center">
            <div className="font-semibold text-lg font-[family-name:var(--font-editorial)] tracking-tight md:text-xl">
              {portalCopy.signIn.title}
            </div>
            <div className="text-muted-foreground text-[0.7rem] tracking-[0.12em] uppercase">
              {portalCopy.signIn.description}
            </div>
          </div>
          <div className="grid gap-3 px-6">
            <label className="grid gap-1.5 text-sm">
              <span className="text-[0.72rem] font-medium tracking-[0.22em] uppercase">
                {portalCopy.signIn.emailLabel}
              </span>
              <input
                className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
                placeholder={portalCopy.signIn.emailPlaceholder}
                readOnly
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="text-[0.72rem] font-medium tracking-[0.22em] uppercase">
                {portalCopy.signIn.passwordLabel}
              </span>
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
            <div className="text-muted-foreground flex items-center gap-3 text-[0.65rem] tracking-[0.12em] uppercase">
              <span className="bg-border h-px flex-1" />
              or continue with
              <span className="bg-border h-px flex-1" />
            </div>
            <button
              type="button"
              className="border-input inline-flex h-9 w-full items-center justify-center rounded-md border text-sm font-medium"
            >
              {portalCopy.magicLink.sendLinkAction}
            </button>
            <button
              type="button"
              className="border-input inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border text-sm font-medium"
            >
              <span aria-hidden="true" className="font-bold text-[#4285f4]">
                G
              </span>
              Continue with Google
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
      <MockNeonSignInSlot mode={mode} />
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
