import { VanguardLanding } from "@/features/landing/vanguard-landing";

import "./lynx-landing.css";

export type LynxLandingPageProps = {
  /** Canonical Neon sign-in href (may include reason / returnTo). */
  signInHref: string;
};

/**
 * Guest landing — Lynx pixel particle stage; face hotspot opens `/auth/sign-in`.
 */
export function LynxLandingPage({ signInHref }: LynxLandingPageProps) {
  return <VanguardLanding signInHref={signInHref} />;
}
