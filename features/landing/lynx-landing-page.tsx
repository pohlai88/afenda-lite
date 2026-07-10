import Image from "next/image";
import Link from "next/link";

import { buttonVariants } from "@/components-V2/platform-components/ui/button";
import { cn } from "@/lib/utils";

import "./lynx-landing.css";

export type LynxLandingPageProps = {
  /** Canonical Neon sign-in href (may include reason / returnTo). */
  signInHref: string;
};

/**
 * Guest landing — deco-comp hero background, left editorial copy, right glass card.
 * Sign in CTA only. Eyes / reticle / shield are baked into the PNG.
 */
export function LynxLandingPage({ signInHref }: LynxLandingPageProps) {
  return (
    <main
      className="lynx-landing"
      data-landing="lynx-morphor"
      aria-labelledby="lynx-landing-title"
    >
      <div className="lynx-landing__bg" aria-hidden="true">
        <Image
          src="/lynx/lynx-deco.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="lynx-landing__bg-image"
        />
      </div>

      <div className="lynx-landing__vignette" aria-hidden="true" />
      <div className="lynx-grain" aria-hidden="true" />

      <span className="lynx-landing__sr-only">
        Lynx Morphor emblem — porcelain and midnight split with a ghost lynx
        guardian, amber and ice eyes, and a shield keyhole mark
      </span>

      <div className="lynx-landing__stage">
        <div className="lynx-landing__copy">
          <p className="lynx-landing__brand-mark">Lynx Morphor</p>

          <p className="lynx-landing__eyebrow">Ghost hero identity</p>

          <h1 id="lynx-landing-title" className="lynx-landing__title">
            <span className="lynx-landing__title-line">One emblem.</span>
            <span className="lynx-landing__title-line">Two atmospheres.</span>
          </h1>

          <div className="lynx-landing__rule" aria-hidden="true" />

          <p className="lynx-landing__lede">
            A cinematic lynx guardian built for interfaces that move between
            light and shadow without losing identity.
          </p>

          <Link
            href={signInHref}
            className={cn(buttonVariants({ size: "lg" }), "lynx-landing__cta")}
          >
            Sign in
          </Link>
        </div>

        <aside className="lynx-landing__card" aria-label="Theme adaptive">
          <p className="lynx-landing__card-kicker">Theme Adaptive</p>
          <p className="lynx-landing__card-body">
            Reads luminance, depth, and translucency.
          </p>
        </aside>
      </div>

      <ul className="lynx-landing__features" aria-label="Product qualities">
        <li>Adaptive Contrast</li>
        <li>Ghost Editorial</li>
        <li>Seamless Shift</li>
      </ul>
    </main>
  );
}
