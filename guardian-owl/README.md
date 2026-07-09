# Guardian Auth Reusable Components

This kit separates the cinematic login page into reusable parts so you do not recreate overlapping layers again and again.

## Components

- `GuardianAuthFacade` — root orchestrator for layout, mode, state, and zones.
- `OwlScene` — image layers, day/night owl fade, ghost owl layers, particles, geometry.
- `EditorialPosterCopy` — reusable poster headline block.
- `AccessVaultCard` — reusable login chamber.
- `ThemeToggle` — day/night switch.
- `GuardianShield` — reusable shield/keyhole/check/warning state emblem.
- `types.ts` — shared mode/state/copy/asset types.

## Suggested asset paths

Place your best PNGs here:

```txt
/public/auth/owls/owl-night-cutout.png
/public/auth/owls/owl-day-cutout.png
/public/auth/owls/owl-night-ghost.png
/public/auth/owls/owl-day-ghost.png
/public/auth/emblems/shield-keyhole-gold.png
/public/auth/textures/marble-veil.png
/public/auth/textures/starfield-noise.png
```

## Use

```tsx
"use client";

import { useState } from "react";
import { GuardianAuthFacade, type GuardianMode, type GuardianState } from "@/components/auth";

export default function LoginPage() {
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
    />
  );
}
```

## Creative rule

PNG owns the soul: owl realism, ghost art, handmade emblems.  
CSS owns the system: layout, theme switching, state glows, rings, particles, responsiveness.

## Build order

1. Static night facade.
2. Add day owl and mode switch.
3. Add form states.
4. Add final polish, reduced-motion support, and mobile tuning.
