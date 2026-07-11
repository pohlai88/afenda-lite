/**
 * Pure ritual engine for the Lynx Sovereign Landing unlock.
 * Pointer coordinates stay outside React; only phase transitions commit state.
 */

export const RITUAL_PHASES = [
  "idle",
  "tracking",
  "magnetized",
  "inserted",
  "quaking",
  "vaultOpening",
  "vaultOpen",
  "departing",
] as const;

export type RitualPhase = (typeof RITUAL_PHASES)[number];

export type RouteIntent = "none" | "signin" | "signup";

export type ShieldMetrics = {
  x: number;
  y: number;
  radius: number;
};

export type PointerSample = {
  x: number;
  y: number;
};

export type MagneticResult = {
  keyX: number;
  keyY: number;
  keyAngle: number;
  distance: number;
  proximity: "free" | "attract" | "align" | "insert";
};

/** Artwork design space used only as SVG viewBox / initial shield path. */
export const ART_VIEW_W = 1440;
export const ART_VIEW_H = 810;
export const ART_CX = ART_VIEW_W / 2;

export const ART_SHIELD_PATH =
  `M${ART_CX} 548 C${ART_CX + 48} 548 ${ART_CX + 72} 575 ${ART_CX + 72} 612 ` +
  `C${ART_CX + 72} 648 ${ART_CX + 36} 678 ${ART_CX} 692 ` +
  `C${ART_CX - 36} 678 ${ART_CX - 72} 648 ${ART_CX - 72} 612 ` +
  `C${ART_CX - 72} 575 ${ART_CX - 48} 548 ${ART_CX} 548 Z`;

/** Outer attraction radius relative to measured shield hit radius. */
export const ATTRACT_RADIUS_FACTOR = 2.35;
/** Rotational alignment radius relative to shield hit radius. */
export const ALIGN_RADIUS_FACTOR = 1.15;
/** Absolute insertion snap radius (px) — also floored against shield size. */
export const INSERT_RADIUS_PX = 42;
/** Magnetic pull strength while attracting (0–1 toward shield). */
export const ATTRACT_PULL = 0.38;
/** Stronger pull while aligning. */
export const ALIGN_PULL = 0.72;

export const QUAKE_DURATION_MS = 620;
export const VAULT_OPEN_DURATION_MS = 420;
export const DEPART_SIGNIN_MS = 380;
export const DEPART_SIGNUP_MS = 420;

const LOCKED_PHASES = new Set<RitualPhase>([
  "inserted",
  "quaking",
  "vaultOpening",
  "vaultOpen",
  "departing",
]);

export function isRitualLocked(phase: RitualPhase): boolean {
  return LOCKED_PHASES.has(phase);
}

export function canAcceptPointer(phase: RitualPhase): boolean {
  return phase === "idle" || phase === "tracking" || phase === "magnetized";
}

export function canDismissVault(phase: RitualPhase): boolean {
  return phase === "vaultOpen" || phase === "vaultOpening";
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function computeMagneticKey(
  pointer: PointerSample,
  shield: ShieldMetrics,
): MagneticResult {
  const dx = shield.x - pointer.x;
  const dy = shield.y - pointer.y;
  const distance = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);

  const attractR = shield.radius * ATTRACT_RADIUS_FACTOR;
  const alignR = Math.max(shield.radius * ALIGN_RADIUS_FACTOR, INSERT_RADIUS_PX * 1.6);
  const insertR = Math.max(INSERT_RADIUS_PX, shield.radius * 0.28);

  if (distance <= insertR) {
    return {
      keyX: shield.x,
      keyY: shield.y,
      keyAngle: angle,
      distance,
      proximity: "insert",
    };
  }

  if (distance <= alignR) {
    const t = ALIGN_PULL;
    return {
      keyX: pointer.x + dx * t,
      keyY: pointer.y + dy * t,
      keyAngle: angle,
      distance,
      proximity: "align",
    };
  }

  if (distance <= attractR) {
    const edge = (attractR - distance) / (attractR - alignR);
    const t = ATTRACT_PULL * Math.min(1, Math.max(0, edge));
    return {
      keyX: pointer.x + dx * t,
      keyY: pointer.y + dy * t,
      keyAngle: angle,
      distance,
      proximity: "attract",
    };
  }

  return {
    keyX: pointer.x,
    keyY: pointer.y,
    keyAngle: angle,
    distance,
    proximity: "free",
  };
}

export function phaseFromProximity(
  current: RitualPhase,
  proximity: MagneticResult["proximity"],
  keyVisible: boolean,
): RitualPhase | null {
  if (!canAcceptPointer(current)) {
    return null;
  }

  if (!keyVisible) {
    return current === "idle" ? null : "idle";
  }

  if (proximity === "insert") {
    return "inserted";
  }
  if (proximity === "attract" || proximity === "align") {
    return current === "magnetized" ? null : "magnetized";
  }
  return current === "tracking" ? null : "tracking";
}

export type RitualAction =
  | { type: "SET_PHASE"; phase: RitualPhase }
  | { type: "UNLOCK_DIRECT" }
  | { type: "DISMISS" }
  | { type: "DEPART"; intent: Exclude<RouteIntent, "none"> }
  | { type: "RESET_IDLE" };

export type RitualState = {
  phase: RitualPhase;
  intent: RouteIntent;
};

export const initialRitualState: RitualState = {
  phase: "idle",
  intent: "none",
};

export function ritualReducer(
  state: RitualState,
  action: RitualAction,
): RitualState {
  switch (action.type) {
    case "SET_PHASE": {
      if (state.phase === action.phase) {
        return state;
      }
      // Block illegal backslides once locked into the unlock sequence.
      if (
        isRitualLocked(state.phase) &&
        !isRitualLocked(action.phase) &&
        action.phase !== "idle"
      ) {
        return state;
      }
      if (state.phase === "departing") {
        return state;
      }
      return { ...state, phase: action.phase };
    }
    case "UNLOCK_DIRECT":
      return { phase: "vaultOpen", intent: "none" };
    case "DISMISS":
      if (!canDismissVault(state.phase)) {
        return state;
      }
      return { phase: "idle", intent: "none" };
    case "DEPART":
      if (state.phase !== "vaultOpen" && state.phase !== "vaultOpening") {
        return state;
      }
      return { phase: "departing", intent: action.intent };
    case "RESET_IDLE":
      return initialRitualState;
    default:
      return state;
  }
}

export function departDelayMs(intent: RouteIntent, reduced: boolean): number {
  if (reduced || intent === "none") {
    return 0;
  }
  return intent === "signin" ? DEPART_SIGNIN_MS : DEPART_SIGNUP_MS;
}
