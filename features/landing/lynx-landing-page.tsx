import { VanguardLanding } from "@/features/landing/vanguard-landing";

import "./lynx-landing.css";

export type LynxLandingPageProps = {
  /** Canonical Neon sign-in href (may include reason / returnTo). */
  signInHref: string;
  /** Canonical Neon sign-up href (may include reason / returnTo). */
  signUpHref: string;
};

/**
 * Guest landing — Vanguard shield unlocks both Neon Auth entry paths.
 */
export function LynxLandingPage({
  signInHref,
  signUpHref,
}: LynxLandingPageProps) {
  return (
    <VanguardLanding signInHref={signInHref} signUpHref={signUpHref} />
  );
}
