import Link from "next/link";
import { OrgSignInForm } from "@/components/org-sign-in-form";
import { PortalEyebrow } from "@/components/portal-eyebrow";
import { PortalThemeToggle } from "@/components/portal-theme-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { portalCopy, PORTAL_NAME } from "@/lib/portal-copy";

export function OrgLoginPage({ accessDenied = false }: { accessDenied?: boolean }) {
  const { orgSignIn, accessDenied: accessDeniedCopy, product } = portalCopy;

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <a href="#sign-in" className="portal-skip-link">
        Skip to sign in
      </a>

      <section
        aria-labelledby="org-landing-heading"
        className="bg-terminal text-terminal-foreground flex flex-col justify-center gap-10 border-r border-border p-8 max-lg:hidden xl:p-14"
      >
        <div className="w-full max-w-md">
          <PortalEyebrow variant="solid" className="mb-4">
            {product.portalEyebrow}
          </PortalEyebrow>
          <h1
            id="org-landing-heading"
            className="text-balance text-3xl font-semibold tracking-tight xl:text-4xl"
          >
            {orgSignIn.heroTitle}
          </h1>
          <p className="mt-4 text-pretty text-base text-terminal-foreground/80">
            {orgSignIn.heroDescription}
          </p>

          <ol className="mt-8 space-y-2">
            {orgSignIn.steps.map((step, index) => (
              <li key={step.label} className="flex items-center gap-3 text-sm">
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground tabular-nums"
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
        </div>

        <p className="text-xs text-terminal-foreground/60">
          <span translate="no">{PORTAL_NAME}</span>
          <span aria-hidden="true"> · </span>
          {orgSignIn.footer}
        </p>
      </section>

      <section
        id="sign-in"
        aria-labelledby="org-sign-in-heading"
        className="flex min-h-dvh flex-col bg-background"
      >
        <div className="portal-header lg:hidden">
          <div className="portal-header-inner">
            <p className="text-sm font-semibold" translate="no">
              {PORTAL_NAME}
            </p>
            <PortalThemeToggle />
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-sm space-y-6">
            <header className="space-y-1 text-center lg:text-left">
              <h2 id="org-sign-in-heading" className="portal-page-title">
                {orgSignIn.title}
              </h2>
              <p className="portal-page-description">{orgSignIn.description}</p>
            </header>

            {accessDenied ? (
              <Alert variant="destructive" role="alert">
                <AlertTitle>{accessDeniedCopy.title}</AlertTitle>
                <AlertDescription>{orgSignIn.accessDenied}</AlertDescription>
              </Alert>
            ) : null}

            <OrgSignInForm />

            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {orgSignIn.clientLink}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
