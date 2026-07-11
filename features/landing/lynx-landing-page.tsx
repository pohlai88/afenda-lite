import { VanguardLanding } from "@/features/landing/vanguard-landing";

import "./lynx-landing.css";

export type LynxLandingPageProps = {
  /** Canonical Neon sign-in href (may include reason / returnTo). */
  signInHref: string;
};

/**
 * Guest landing — background-only Vanguard hero; face hotspot opens `/auth/sign-in`.
 */
export function LynxLandingPage({ signInHref }: LynxLandingPageProps) {
  return <VanguardLanding signInHref={signInHref} />;
}
