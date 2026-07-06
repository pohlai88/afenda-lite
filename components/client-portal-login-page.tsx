import Link from "next/link";
import { ClientSignInForm } from "@/components/client-sign-in-form";
import { PortalEyebrow } from "@/components/portal-eyebrow";
import { PortalThemeToggle } from "@/components/portal-theme-toggle";
import { PortalTrustFooter } from "@/components/portal-trust-footer";
import { PortalTrustNotice } from "@/components/portal-trust-notice";
import { portalCopy, PORTAL_NAME } from "@/lib/portal-copy";

export function ClientPortalLoginPage() {
  const { signIn, product } = portalCopy;

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <a href="#sign-in" className="portal-skip-link">
        Skip to sign in
      </a>

      <section
        aria-labelledby="landing-heading"
        className="bg-terminal text-terminal-foreground v-stack justify-center gap-10 border-r border-border p-8 max-lg:hidden xl:p-14"
      >
        <div className="w-full max-w-md">
          <PortalEyebrow variant="solid" className="mb-4">
            {product.portalEyebrow}
          </PortalEyebrow>
          <h1
            id="landing-heading"
            className="text-balance text-3xl font-semibold tracking-tight xl:text-4xl"
          >
            {signIn.heroTitle}
          </h1>
          <p className="mt-4 text-pretty text-base text-terminal-foreground/80">
            {signIn.heroDescription}
          </p>

          <ol className="mt-8 space-y-2">
            {signIn.steps.map((step, index) => (
              <li key={step.label} className="h-stack items-center gap-3 text-sm">
                <span
                  className="center size-6 shrink-0 rounded-full bg-primary text-xs font-semibold text-primary-foreground tabular-nums"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span>
                  <span className="font-medium">{step.label}</span>
                  <span className="text-terminal-foreground/70">
                    {" "}
                    — {step.detail}
                  </span>
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-8">
            <PortalTrustNotice />
          </div>
        </div>

        <PortalTrustFooter />
      </section>

      <section
        id="sign-in"
        aria-labelledby="sign-in-heading"
        className="v-stack min-h-dvh bg-background"
      >
        <div className="portal-header lg:hidden">
          <div className="portal-header-inner">
            <p className="text-sm font-semibold" translate="no">
              {PORTAL_NAME}
            </p>
            <PortalThemeToggle />
          </div>
        </div>

        <div className="v-stack spacer center px-4 py-10 sm:px-6">
          <div className="w-full max-w-sm space-y-6">
            <header className="space-y-1 text-center lg:text-left">
              <h2 id="sign-in-heading" className="portal-page-title">
                {signIn.title}
              </h2>
              <p className="portal-page-description">{signIn.description}</p>
            </header>

            <p className="text-pretty text-xs text-muted-foreground">
              {portalCopy.trust.notices.clientLogin}
            </p>

            <ClientSignInForm />

            <p className="text-center text-xs text-muted-foreground">
              {signIn.inviteHint}
            </p>

            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/org/login"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {signIn.orgLink}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
