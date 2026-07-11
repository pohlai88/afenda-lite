"use client";

import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useReducer,
  useRef,
} from "react";

import {
  ART_CX,
  ART_SHIELD_PATH,
  ART_VIEW_H,
  ART_VIEW_W,
  QUAKE_DURATION_MS,
  VAULT_OPEN_DURATION_MS,
  computeMagneticKey,
  departDelayMs,
  initialRitualState,
  isRitualLocked,
  phaseFromProximity,
  prefersReducedMotion,
  ritualReducer,
  type RitualPhase,
  type RouteIntent,
  type ShieldMetrics,
} from "@/features/landing/ritual-engine";

const VIEW_BOX = `0 0 ${ART_VIEW_W} ${ART_VIEW_H}`;
const TRAIL_GHOST_COUNT = 6;
const TRAIL_HISTORY_LIMIT = 8;
const MAGIC_BEAD_COUNT = 10;
const TRAIL_SAMPLE_DISTANCE_PX = 3;
const BEAD_RELEASE_DISTANCE_PX = 12;
const TRAIL_OPACITIES = [0.44, 0.31, 0.22, 0.15, 0.1, 0.06] as const;

type TrailPoint = {
  x: number;
  y: number;
};

type MagicBead = TrailPoint & {
  bornAt: number;
  duration: number;
  driftX: number;
};

function ArtMap({ children }: { children: ReactNode }) {
  return (
    <svg
      className="lynx-landing__artmap"
      viewBox={VIEW_BOX}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
    >
      {children}
    </svg>
  );
}

export type VanguardLandingProps = {
  /** Canonical Neon sign-in href (may include reason / returnTo). */
  signInHref: string;
  /** Canonical Neon sign-up href (may include reason / returnTo). */
  signUpHref: string;
};

/**
 * Guest landing — hybrid unlock ritual:
 * approach → magnetize → insert → quake → portal → Sovereign Vault → auth.
 */
export function VanguardLanding({
  signInHref,
  signUpHref,
}: VanguardLandingProps) {
  const router = useRouter();
  const [ritual, dispatch] = useReducer(ritualReducer, initialRitualState);

  const landingRef = useRef<HTMLElement | null>(null);
  const cameraRef = useRef<HTMLDivElement | null>(null);
  const parallaxRef = useRef<HTMLDivElement | null>(null);
  const shieldPathRef = useRef<SVGPathElement | null>(null);
  const shieldButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const firstDoorRef = useRef<HTMLAnchorElement | null>(null);

  const shieldRef = useRef<ShieldMetrics>({ x: 0, y: 0, radius: 96 });
  const pointerRef = useRef({ x: 0, y: 0, active: false });
  const trailHistoryRef = useRef<TrailPoint[]>([]);
  const lastTrailPointRef = useRef<TrailPoint | null>(null);
  const lastBeadPointRef = useRef<TrailPoint | null>(null);
  const magicBeadsRef = useRef<Array<MagicBead | null>>(
    Array.from({ length: MAGIC_BEAD_COUNT }, () => null),
  );
  const beadCursorRef = useRef(0);
  const phaseRef = useRef<RitualPhase>(ritual.phase);
  const focusChooserRef = useRef(false);
  const departLockRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const sequenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedRef = useRef(false);

  phaseRef.current = ritual.phase;

  const clearSequenceTimer = useCallback(() => {
    if (sequenceTimerRef.current) {
      clearTimeout(sequenceTimerRef.current);
      sequenceTimerRef.current = null;
    }
  }, []);

  const writeKeyCss = useCallback(
    (keyX: number, keyY: number, keyAngle: number, visible: boolean) => {
      const landing = landingRef.current;
      if (!landing) {
        return;
      }
      landing.style.setProperty("--key-x", `${keyX}px`);
      landing.style.setProperty("--key-y", `${keyY}px`);
      landing.style.setProperty("--key-angle", `${keyAngle}rad`);
      landing.dataset.keyVisible = visible ? "1" : "0";
    },
    [],
  );

  const writeParallax = useCallback((pointerX: number, pointerY: number) => {
    const landing = landingRef.current;
    const parallax = parallaxRef.current;
    if (!landing || !parallax) {
      return;
    }
    const bounds = landing.getBoundingClientRect();
    const nx = bounds.width ? (pointerX / bounds.width - 0.5) * 2 : 0;
    const ny = bounds.height ? (pointerY / bounds.height - 0.5) * 2 : 0;
    parallax.style.setProperty("--parallax-x", `${nx * 6}px`);
    parallax.style.setProperty("--parallax-y", `${ny * 4}px`);
  }, []);

  const clearMagicFx = useCallback(() => {
    const landing = landingRef.current;
    trailHistoryRef.current = [];
    lastTrailPointRef.current = null;
    lastBeadPointRef.current = null;
    magicBeadsRef.current.fill(null);
    if (!landing) {
      return;
    }

    landing.style.setProperty("--key-speed", "0");
    for (let index = 0; index < TRAIL_GHOST_COUNT; index += 1) {
      landing.style.setProperty(`--trail-${index}-opacity`, "0");
    }
    for (let index = 0; index < MAGIC_BEAD_COUNT; index += 1) {
      landing.style.setProperty(`--bead-${index}-life`, "0");
    }
  }, []);

  const writeMagicFx = useCallback(
    (keyX: number, keyY: number, timestamp: number) => {
      const landing = landingRef.current;
      if (!landing || reducedRef.current) {
        return false;
      }

      const point = { x: keyX, y: keyY };
      const lastTrail = lastTrailPointRef.current;
      const travel = lastTrail
        ? Math.hypot(point.x - lastTrail.x, point.y - lastTrail.y)
        : 0;

      const speed = Math.min(1, travel / 24);
      landing.style.setProperty("--key-speed", `${speed}`);
      landing.style.setProperty("--key-speed-scale", `${1 + speed * 0.8}`);

      if (!lastTrail || travel >= TRAIL_SAMPLE_DISTANCE_PX) {
        trailHistoryRef.current = [
          point,
          ...trailHistoryRef.current,
        ].slice(0, TRAIL_HISTORY_LIMIT);
        lastTrailPointRef.current = point;
      }

      for (let index = 0; index < TRAIL_GHOST_COUNT; index += 1) {
        const sample = trailHistoryRef.current[index + 1];
        landing.style.setProperty(
          `--trail-${index}-opacity`,
          sample ? `${TRAIL_OPACITIES[index]}` : "0",
        );
        if (sample) {
          landing.style.setProperty(`--trail-${index}-x`, `${sample.x}px`);
          landing.style.setProperty(`--trail-${index}-y`, `${sample.y}px`);
        }
      }

      const lastBead = lastBeadPointRef.current;
      const beadTravel = lastBead
        ? Math.hypot(point.x - lastBead.x, point.y - lastBead.y)
        : BEAD_RELEASE_DISTANCE_PX;
      if (beadTravel >= BEAD_RELEASE_DISTANCE_PX) {
        const index = beadCursorRef.current;
        magicBeadsRef.current[index] = {
          x: lastBead ? (lastBead.x + point.x) / 2 : point.x,
          y: lastBead ? (lastBead.y + point.y) / 2 : point.y,
          bornAt: timestamp,
          duration: 460 + (index % 4) * 70,
          driftX: ((index % 5) - 2) * 3,
        };
        beadCursorRef.current = (index + 1) % MAGIC_BEAD_COUNT;
        lastBeadPointRef.current = point;
      }

      let beadsAlive = false;
      magicBeadsRef.current.forEach((bead, index) => {
        if (!bead) {
          landing.style.setProperty(`--bead-${index}-life`, "0");
          return;
        }

        const progress = Math.min(1, (timestamp - bead.bornAt) / bead.duration);
        const life = 1 - progress;
        if (life <= 0) {
          magicBeadsRef.current[index] = null;
          landing.style.setProperty(`--bead-${index}-life`, "0");
          return;
        }

        beadsAlive = true;
        landing.style.setProperty(`--bead-${index}-x`, `${bead.x}px`);
        landing.style.setProperty(`--bead-${index}-y`, `${bead.y}px`);
        landing.style.setProperty(`--bead-${index}-life`, `${life}`);
        landing.style.setProperty(
          `--bead-${index}-drift-x`,
          `${bead.driftX * progress}px`,
        );
        landing.style.setProperty(
          `--bead-${index}-drift-y`,
          `${10 + progress * 18}px`,
        );
      });

      return beadsAlive;
    },
    [],
  );

  const runPointerFrame = useCallback((timestamp: number) => {
    rafRef.current = null;
    const landing = landingRef.current;
    if (!landing) {
      return;
    }

    const phase = phaseRef.current;
    if (!pointerRef.current.active) {
      return;
    }

    if (isRitualLocked(phase)) {
      // Keep key registered on the keyhole during quake / portal / vault.
      const shield = shieldRef.current;
      writeKeyCss(shield.x, shield.y, Number.parseFloat(
        landing.style.getPropertyValue("--key-angle") || "0",
      ) || 0, true);
      writeMagicFx(shield.x, shield.y, timestamp);
      return;
    }

    const magnetic = computeMagneticKey(pointerRef.current, shieldRef.current);
    writeKeyCss(magnetic.keyX, magnetic.keyY, magnetic.keyAngle, true);
    const beadsAlive = writeMagicFx(
      magnetic.keyX,
      magnetic.keyY,
      timestamp,
    );
    writeParallax(pointerRef.current.x, pointerRef.current.y);

    const next = phaseFromProximity(phase, magnetic.proximity, true);
    if (next && next !== phase) {
      dispatch({ type: "SET_PHASE", phase: next });
    }
    if (beadsAlive) {
      rafRef.current = window.requestAnimationFrame(runPointerFrame);
    }
  }, [writeKeyCss, writeMagicFx, writeParallax]);

  const schedulePointerFrame = useCallback(() => {
    if (rafRef.current !== null) {
      return;
    }
    rafRef.current = window.requestAnimationFrame(runPointerFrame);
  }, [runPointerFrame]);

  // Measure shield center from the rendered SVG path (not hard-coded px).
  useEffect(() => {
    const landing = landingRef.current;
    const shieldPath = shieldPathRef.current;
    if (!landing || !shieldPath) {
      return;
    }

    const updateShieldMetrics = () => {
      const landingRect = landing.getBoundingClientRect();
      const shieldRect = shieldPath.getBoundingClientRect();
      const x = shieldRect.left - landingRect.left + shieldRect.width / 2;
      const y = shieldRect.top - landingRect.top + shieldRect.height / 2;
      const radius = Math.max(72, Math.max(shieldRect.width, shieldRect.height));

      shieldRef.current = { x, y, radius };
      landing.style.setProperty("--shield-x", `${x}px`);
      landing.style.setProperty("--shield-y", `${y}px`);
      landing.style.setProperty("--portal-x", `${x}px`);
      landing.style.setProperty("--portal-y", `${y}px`);
      landing.style.setProperty("--shield-hit-size", `${radius}px`);
    };

    updateShieldMetrics();
    window.addEventListener("resize", updateShieldMetrics);
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(updateShieldMetrics);
    observer?.observe(landing);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateShieldMetrics);
    };
  }, []);

  // Track reduced-motion preference.
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      reducedRef.current = media.matches;
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  // Ritual sequence: inserted → quaking → vaultOpening → vaultOpen
  useEffect(() => {
    clearSequenceTimer();
    const { phase } = ritual;

    if (phase === "inserted") {
      if (reducedRef.current || prefersReducedMotion()) {
        focusChooserRef.current = true;
        dispatch({ type: "UNLOCK_DIRECT" });
        return;
      }
      dispatch({ type: "SET_PHASE", phase: "quaking" });
      return;
    }

    if (phase === "quaking") {
      sequenceTimerRef.current = setTimeout(() => {
        dispatch({ type: "SET_PHASE", phase: "vaultOpening" });
      }, QUAKE_DURATION_MS);
      return;
    }

    if (phase === "vaultOpening") {
      sequenceTimerRef.current = setTimeout(() => {
        focusChooserRef.current = true;
        dispatch({ type: "SET_PHASE", phase: "vaultOpen" });
      }, VAULT_OPEN_DURATION_MS);
    }
  }, [ritual.phase, clearSequenceTimer]);

  // Dialog open / close + Escape + focus restore
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const vaultVisible =
      ritual.phase === "vaultOpening" ||
      ritual.phase === "vaultOpen" ||
      ritual.phase === "departing";

    if (vaultVisible) {
      if (!dialog.open) {
        // Non-modal so the key cursor plane can stack above the vault art.
        dialog.show();
      }
      if (ritual.phase === "vaultOpen" && focusChooserRef.current) {
        focusChooserRef.current = false;
        firstDoorRef.current?.focus();
      }

      const onEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape" && ritual.phase !== "departing") {
          e.preventDefault();
          clearSequenceTimer();
          departLockRef.current = false;
          dispatch({ type: "DISMISS" });
          shieldButtonRef.current?.focus();
        }
      };
      document.addEventListener("keydown", onEscape);
      return () => document.removeEventListener("keydown", onEscape);
    }

    if (dialog.open) {
      dialog.close();
    }
  }, [ritual.phase, clearSequenceTimer]);

  // Cleanup rAF / timers on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      clearSequenceTimer();
    };
  }, [clearSequenceTimer]);

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") {
      return;
    }
    const landing = landingRef.current;
    if (!landing) {
      return;
    }
    const bounds = landing.getBoundingClientRect();
    pointerRef.current = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      active: true,
    };
    schedulePointerFrame();
  };

  const hideKey = () => {
    pointerRef.current.active = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (!isRitualLocked(phaseRef.current)) {
      writeKeyCss(0, 0, 0, false);
      clearMagicFx();
      dispatch({ type: "SET_PHASE", phase: "idle" });
      const parallax = parallaxRef.current;
      if (parallax) {
        parallax.style.setProperty("--parallax-x", "0px");
        parallax.style.setProperty("--parallax-y", "0px");
      }
    }
  };

  const unlockDirect = (focusChooser: boolean) => {
    if (isRitualLocked(phaseRef.current)) {
      return;
    }
    clearSequenceTimer();
    focusChooserRef.current = focusChooser;
    if (reducedRef.current || prefersReducedMotion()) {
      dispatch({ type: "UNLOCK_DIRECT" });
      return;
    }
    // Keyboard / explicit click: short-circuit through portal open.
    dispatch({ type: "SET_PHASE", phase: "vaultOpening" });
  };

  const dismissDialog = () => {
    if (ritual.phase === "departing") {
      return;
    }
    clearSequenceTimer();
    departLockRef.current = false;
    dispatch({ type: "DISMISS" });
    shieldButtonRef.current?.focus();
  };

  const handleDialogBackdropClick = (
    event: React.MouseEvent<HTMLDialogElement>,
  ) => {
    if (event.target === dialogRef.current) {
      dismissDialog();
    }
  };

  const handleDoorClick =
    (intent: Exclude<RouteIntent, "none">, href: string) =>
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      if (departLockRef.current || ritual.phase === "departing") {
        return;
      }
      departLockRef.current = true;
      dispatch({ type: "DEPART", intent });
      const delay = departDelayMs(intent, prefersReducedMotion());
      window.setTimeout(() => {
        router.push(href);
      }, delay);
    };

  const vaultExpanded =
    ritual.phase === "vaultOpening" ||
    ritual.phase === "vaultOpen" ||
    ritual.phase === "departing";

  return (
    <main
      ref={landingRef}
      className="lynx-landing"
      data-landing="vanguard-unlock"
      data-phase={ritual.phase}
      data-intent={ritual.intent}
      data-key-visible="0"
      onPointerMove={handlePointerMove}
      onPointerLeave={hideKey}
    >
      {/* L0 field + L1–L6 stage stack with separated transform owners */}
      <div ref={cameraRef} className="lynx-landing__camera" aria-hidden="true">
        <div ref={parallaxRef} className="lynx-landing__parallax">
          <div className="lynx-landing__stage">
            <picture className="lynx-landing__picture">
              <source srcSet="/lynx/lynx-laptop.webp" type="image/webp" />
              <img
                src="/lynx/lynx-laptop.png"
                alt=""
                width={ART_VIEW_W}
                height={ART_VIEW_H}
                decoding="async"
                fetchPriority="high"
                sizes="100vw"
                className="lynx-landing__hero"
                data-landing-hero=""
              />
            </picture>

            <div className="lynx-landing__hud" data-landing-hud="" />
            <div className="lynx-landing__portal" data-landing-portal="" />
          </div>
        </div>
      </div>

      <button
        ref={shieldButtonRef}
        type="button"
        className="lynx-landing__shield"
        aria-label="Unlock authentication options"
        aria-controls="lynx-vault-dialog"
        aria-expanded={vaultExpanded}
        data-landing-shield=""
        onClick={(event) => unlockDirect(event.detail === 0)}
      />

      <div className="lynx-landing__shield-art" aria-hidden="true">
        <ArtMap>
          <path
            ref={shieldPathRef}
            className="lynx-landing__shield-region"
            d={ART_SHIELD_PATH}
          />
          <text
            className="lynx-landing__shield-label"
            x={ART_CX}
            y={720}
            textAnchor="middle"
          >
            Unlock
          </text>
        </ArtMap>
      </div>

      <dialog
        ref={dialogRef}
        id="lynx-vault-dialog"
        className="lynx-vault-dialog"
        aria-label="Sovereign Vault — choose Sign In or Create Account"
        onCancel={(e) => {
          e.preventDefault();
          dismissDialog();
        }}
        onClick={handleDialogBackdropClick}
      >
        <div
          className="sovereign-vault-shell"
          data-state={vaultExpanded ? "open" : "closed"}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              dismissDialog();
            }
          }}
        >
          <div className="sovereign-sky" aria-hidden="true">
            <div className="sovereign-sky__clouds sovereign-sky__clouds--far" />
            <div className="sovereign-sky__clouds sovereign-sky__clouds--mid" />
            <div className="sovereign-sky__clouds sovereign-sky__clouds--near" />
            <div className="sovereign-sky__moon" />
            <div className="sovereign-sky__portal" />
            <div className="sovereign-sky__mist" />
            <div className="sovereign-sky__stars" />
            <div className="sovereign-sky__vignette" />
          </div>

          <div className="sovereign-vault">
            <img
              className="sovereign-vault__art"
              src="/lynx/lynx-auth-popup.png"
              alt=""
              width={1536}
              height={1024}
              decoding="async"
              draggable={false}
            />
            <a
              href={signUpHref}
              aria-label="Create Account"
              className="sovereign-vault__create"
              data-landing-hotspot="signup"
              onClick={handleDoorClick("signup", signUpHref)}
            />
            <a
              ref={firstDoorRef}
              href={signInHref}
              aria-label="Sign In"
              className="sovereign-vault__signin"
              data-landing-hotspot="signin"
              onClick={handleDoorClick("signin", signInHref)}
            />
          </div>
        </div>
      </dialog>

      {/* Cursor plane sits above vault art so the key never falls behind. */}
      <div className="lynx-landing__cursor-plane" aria-hidden="true">
        <div className="lynx-landing__solaris" data-key-solaris="" />
        <div className="lynx-landing__key-trail">
          {Array.from({ length: TRAIL_GHOST_COUNT }, (_, index) => (
            <span
              className="lynx-landing__key-ghost"
              key={`trail-${index}`}
            />
          ))}
        </div>
        <div className="lynx-landing__key-beads">
          {Array.from({ length: MAGIC_BEAD_COUNT }, (_, index) => (
            <span
              className="lynx-landing__key-bead"
              key={`bead-${index}`}
            />
          ))}
        </div>

        <span className="lynx-landing__key" data-landing-key="" aria-hidden="true">
          <span className="lynx-landing__key-aura" />
          <span className="lynx-landing__key-sparks" />
          <svg
            className="lynx-landing__key-glyph"
            viewBox="0 0 120 40"
            focusable="false"
          >
            <defs>
              <linearGradient
                id="lynx-key-metal"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#f3e2b8" />
                <stop offset="42%" stopColor="#c9a24a" />
                <stop offset="78%" stopColor="#7a4e18" />
                <stop offset="100%" stopColor="#e8c56a" />
              </linearGradient>
              <linearGradient
                id="lynx-key-ice"
                x1="0%"
                y1="50%"
                x2="100%"
                y2="50%"
              >
                <stop offset="0%" stopColor="#9fd4f5" />
                <stop offset="100%" stopColor="#e8f6ff" />
              </linearGradient>
              <radialGradient id="lynx-key-gem" cx="50%" cy="45%" r="55%">
                <stop offset="0%" stopColor="#fff8e0" />
                <stop offset="45%" stopColor="#5ec8ff" />
                <stop offset="100%" stopColor="#0a3a6e" />
              </radialGradient>
              <filter
                id="lynx-key-glow"
                x="-40%"
                y="-40%"
                width="180%"
                height="180%"
              >
                <feGaussianBlur stdDeviation="1.2" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <g className="lynx-landing__keyblade-evolution">
              <path
                className="lynx-landing__keyblade-body"
                d="M29 14.5 L104 11.5 L117 20 L104 28.5 L29 25.5 L37 20 Z"
                fill="url(#lynx-key-metal)"
                stroke="url(#lynx-key-ice)"
                strokeWidth="1.1"
              />
              <path
                className="lynx-landing__keyblade-edge"
                d="M38 15.8 L103 13 L113 20 L103 20 L38 20"
                fill="none"
                stroke="url(#lynx-key-ice)"
                strokeWidth="1.35"
                strokeLinecap="round"
              />
              <path
                className="lynx-landing__keyblade-rune-channel"
                d="M43 21.7 H96"
                fill="none"
                stroke="#fff3c4"
                strokeWidth="1"
                strokeDasharray="3 5"
                strokeLinecap="round"
              />
              <g className="lynx-landing__keyblade-runes" fill="#d8f2ff">
                <path d="M50 17 L53 20 L50 23 L47 20 Z" />
                <path d="M65 17 L68 20 L65 23 L62 20 Z" />
                <path d="M80 17 L83 20 L80 23 L77 20 Z" />
                <path d="M95 17 L98 20 L95 23 L92 20 Z" />
              </g>
              <g
                className="lynx-landing__keyblade-guard"
                fill="none"
                stroke="url(#lynx-key-metal)"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M29 20 C34 13 38 8 43 6 C41 13 38 17 34 20" />
                <path d="M29 20 C34 27 38 32 43 34 C41 27 38 23 34 20" />
              </g>
            </g>

            <g className="lynx-landing__key-core">
              <circle
                cx="16"
                cy="20"
                r="13"
                fill="none"
                stroke="url(#lynx-key-metal)"
                strokeWidth="3.2"
              />
              <circle
                cx="16"
                cy="20"
                r="7.5"
                fill="none"
                stroke="url(#lynx-key-ice)"
                strokeWidth="1.4"
                opacity="0.9"
              />
              <circle cx="16" cy="20" r="3.4" fill="url(#lynx-key-gem)" />
              <path
                d="M16 7.2 L17.1 10.4 L20.4 10.4 L17.7 12.4 L18.7 15.6 L16 13.7 L13.3 15.6 L14.3 12.4 L11.6 10.4 L14.9 10.4 Z"
                fill="#f7efd0"
                opacity="0.85"
              />
              <path
                d="M28 17.2 H78 Q82 17.2 82 20 Q82 22.8 78 22.8 H28 Z"
                fill="url(#lynx-key-metal)"
                filter="url(#lynx-key-glow)"
              />
              <path
                d="M30 18.4 H76"
                stroke="url(#lynx-key-ice)"
                strokeWidth="0.9"
                opacity="0.65"
              />
              <path
                d="M62 22.8 V31.5 M62 31.5 H67.5 M70 22.8 V28.5 M70 28.5 H74.5 M78 22.8 V33.2 M78 33.2 H83"
                fill="none"
                stroke="url(#lynx-key-metal)"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M62 24.2 V29.8 M70 24.2 V27 M78 24.2 V31"
                stroke="url(#lynx-key-ice)"
                strokeWidth="0.7"
                opacity="0.75"
              />
            </g>
          </svg>
        </span>
      </div>
    </main>
  );
}
