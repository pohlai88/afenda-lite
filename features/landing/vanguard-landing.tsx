"use client";

import Link from "next/link";

/** Source artwork coordinate system (1817 × 866). */
const VIEW_W = 1817;
const VIEW_H = 866;
const CX = VIEW_W / 2;

export type VanguardLandingProps = {
  /** Canonical Neon sign-in href (may include reason / returnTo). */
  signInHref: string;
};

/**
 * Background-only Vanguard gateway — CSS hero backdrop, face hotspot → /auth/sign-in.
 */
export function VanguardLanding({ signInHref }: VanguardLandingProps) {
  return (
    <main className="lynx-landing" data-landing="vanguard-gateway">
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
          preserveAspectRatio="xMidYMid slice"
        >
          <path
            className="lynx-landing__hit-region"
            d={`M${CX} 48 C${CX + 210} 48 ${CX + 340} 160 ${CX + 380} 300 C${CX + 410} 430 ${CX + 390} 560 ${CX + 320} 680 C${CX + 240} 790 ${CX + 120} 830 ${CX} 840 C${CX - 120} 830 ${CX - 240} 790 ${CX - 320} 680 C${CX - 390} 560 ${CX - 410} 430 ${CX - 380} 300 C${CX - 340} 160 ${CX - 210} 48 ${CX} 48 Z`}
          />
          <path
            className="lynx-landing__hit-region lynx-landing__hit-region--shield"
            d={`M${CX} 470 C${CX + 70} 470 ${CX + 100} 510 ${CX + 100} 555 C${CX + 100} 600 ${CX + 55} 640 ${CX} 655 C${CX - 55} 640 ${CX - 100} 600 ${CX - 100} 555 C${CX - 100} 510 ${CX - 70} 470 ${CX} 470 Z`}
          />
        </svg>
      </Link>
    </main>
  );
}
