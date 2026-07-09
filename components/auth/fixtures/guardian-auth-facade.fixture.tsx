"use client";

import { useState } from "react";
import {
  GuardianAuthFacade,
  type GuardianMode,
  type GuardianState,
} from "@/components/auth";
import { GUARDIAN_AUTH_ASSET_SET } from "@/lib/portal-brand";

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

/** Interactive surface — theme toggle + state dev toolbar for design review. */
export function GuardianAuthFacadeInteractive() {
  const [mode, setMode] = useState<GuardianMode>("night");
  const [state, setState] = useState<GuardianState>("idle");

  const states: GuardianState[] = [
    "idle",
    "typing",
    "loading",
    "success",
    "error",
    "locked",
    "warning",
  ];

  return (
    <>
      <GuardianAuthFacade
        mode={mode}
        state={state}
        onModeChange={setMode}
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
        {states.map((nextState) => (
          <button
            key={nextState}
            type="button"
            aria-pressed={state === nextState}
            onClick={() => setState(nextState)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,.22)",
              background:
                state === nextState
                  ? "rgba(127, 178, 255, .35)"
                  : "rgba(0,0,0,.45)",
              color: "#f4f7ff",
              font: "inherit",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {nextState}
          </button>
        ))}
      </div>
    </>
  );
}
