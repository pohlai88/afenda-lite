import { AdminSignInForm } from "@/components/admin-sign-in-form";

const steps = [
  {
    label: "Create",
    detail: "Publish a satisfaction survey in under a minute.",
  },
  {
    label: "Share",
    detail: "Send customers a public link — no account required.",
  },
  {
    label: "Review",
    detail: "Track scores and read comments from one dashboard.",
  },
] as const;

export function LandingSignInScreen() {
  return (
    <div className="relative flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <a
        href="#sign-in"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Skip to sign in
      </a>

      <div className="landing-grid pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden="true" />

      <div className="landing-glow pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-brand/20 blur-3xl" aria-hidden="true" />
      <div className="landing-glow pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-brand/10 blur-3xl" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-1 flex-col px-5 py-5 sm:px-8 sm:py-6 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10 lg:px-10">
        <section
          aria-labelledby="landing-heading"
          className="flex min-h-0 flex-1 flex-col justify-center lg:pr-4"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Customer feedback
          </p>

          <h1
            id="landing-heading"
            className="font-display mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.08]"
          >
            Collect customer feedback in minutes
          </h1>

          <p className="mt-3 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            Operator portal for creating surveys, sharing public links, and
            reviewing responses.
          </p>

          <ol className="mt-5 hidden min-w-0 space-y-2.5 sm:block lg:mt-8">
            {steps.map((step, index) => (
              <li
                key={step.label}
                className="flex min-w-0 items-start gap-3 rounded-xl border border-border/70 bg-card/60 px-4 py-3 backdrop-blur-sm"
              >
                <span
                  className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-semibold text-brand-foreground tabular-nums"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{step.label}</span>
                  <span className="block text-sm text-muted-foreground">
                    {step.detail}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="sign-in"
          aria-labelledby="sign-in-heading"
          className="flex shrink-0 items-center justify-center pb-2 lg:pb-0"
        >
          <AdminSignInForm />
        </section>
      </div>

      <footer className="relative z-10 shrink-0 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-xs text-muted-foreground sm:px-8">
        <span translate="no">Feedback Portal</span>
        <span aria-hidden="true"> · </span>
        Secure operator access
      </footer>
    </div>
  );
}
