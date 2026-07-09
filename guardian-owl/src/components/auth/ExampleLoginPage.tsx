"use client";

import { useState } from "react";
import { GuardianAuthFacade } from "./GuardianAuthFacade";
import type { GuardianMode, GuardianState } from "./types";

export function ExampleLoginPage() {
  const [mode, setMode] = useState<GuardianMode>("night");
  const [state, setState] = useState<GuardianState>("idle");

  return (
    <GuardianAuthFacade
      mode={mode}
      state={state}
      onModeChange={setMode}
      assets={{
        owlNight: "/auth/owls/owl-night-cutout.png",
        owlDay: "/auth/owls/owl-day-cutout.png",
        owlNightGhost: "/auth/owls/owl-night-ghost.png",
        owlDayGhost: "/auth/owls/owl-day-ghost.png",
      }}
    >
      {/*
        Replace this with your real form later, or use AccessVaultCard directly.
        The facade stays reusable either way.
      */}
      <div style={{ display: "grid", gap: 12 }}>
        <button onClick={() => setState("idle")}>Idle</button>
        <button onClick={() => setState("loading")}>Loading</button>
        <button onClick={() => setState("success")}>Success</button>
        <button onClick={() => setState("error")}>Error</button>
      </div>
    </GuardianAuthFacade>
  );
}
