"use client";

import Link from "next/link";

import { LynxPixelCanvas } from "@/features/landing/lynx-pixel-canvas.client";

/** Hit-map space matches pixel artwork aspect (~1672 × 941). */
const VIEW_W = 1672;
const VIEW_H = 941;
const CX = VIEW_W / 2;

export type VanguardLandingProps = {
  /** Canonical Neon sign-in href (may include reason / returnTo). */
  signInHref: string;
};

/**
 * Guest landing — Xerp-style Lynx particle stage; face hotspot → /auth/sign-in.
 */
export function VanguardLanding({ signInHref }: VanguardLandingProps) {
  return (
    <main className="lynx-landing" data-landing="pixel-gateway">
      <div className="lynx-landing__stage" aria-hidden="true">
        <LynxPixelCanvas />
      </div>
      <Link
        href={signInHref}
        className="lynx-landing__hotspot"
        aria-label="Open authentication"
        data-landing-hotspot=""
      >
        <svg
          className="lynx-landing__hitmap"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          aria-hidden="true"
          focusable="false"
          preserveAspectRatio="xMidYMid meet"
        >
          <path
            className="lynx-landing__hit-region"
            d={`M${CX} 80 C${CX + 280} 80 ${CX + 420} 220 ${CX + 460} 380 C${CX + 490} 520 ${CX + 450} 680 ${CX + 340} 800 C${CX + 230} 900 ${CX + 110} 920 ${CX} 925 C${CX - 110} 920 ${CX - 230} 900 ${CX - 340} 800 C${CX - 450} 680 ${CX - 490} 520 ${CX - 460} 380 C${CX - 420} 220 ${CX - 280} 80 ${CX} 80 Z`}
          />
        </svg>
      </Link>
    </main>
  );
}
