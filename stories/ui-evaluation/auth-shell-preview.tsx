import { PortalAuthLayout } from "@/components/portal-auth-layout";
import { portalCopy } from "@/lib/portal-copy";

/** Mock sign-in fields for Storybook — mirrors Neon AuthView layout without provider. */
function MockSignInForm() {
  const { signIn } = portalCopy;

  return (
    <div className="space-y-4">
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">{signIn.emailLabel}</span>
        <input
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          placeholder={signIn.emailPlaceholder}
          readOnly
          defaultValue=""
        />
      </label>
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">{signIn.passwordLabel}</span>
        <input
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          type="password"
          placeholder="••••••••"
          readOnly
        />
      </label>
      <button
        type="button"
        className="h-8 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground"
      >
        {signIn.submit}
      </button>
    </div>
  );
}

/** Production iam-check auth shell — real BrandMark, vault tokens, portal copy. */
export function IamCheckAuthShellPreview() {
  const { signIn, product } = portalCopy;

  return (
    <PortalAuthLayout
      eyebrow={product.portalEyebrow}
      heroTitle={signIn.heroTitle}
      heroDescription={signIn.heroDescription}
      signInTitle={signIn.title}
      signInDescription={signIn.description}
      trustNotice={portalCopy.trust.notices.clientLogin}
      alternateLink={{ href: "/org/login", label: signIn.orgLink }}
      footerHint={signIn.inviteHint}
      form={<MockSignInForm />}
    />
  );
}

/** Why shadcn studio login blocks were rejected — no generic preview imagery. */
export function RejectedStudioAuthPanel() {
  return (
    <div className="flex min-h-[480px] flex-col justify-center rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-6 sm:p-8">
      <p className="text-xs font-medium uppercase tracking-wide text-destructive">
        Rejected — not iam-check
      </p>
      <h3 className="mt-2 font-heading text-lg font-semibold">
        shadcn studio login-page-01 / 02 / 03
      </h3>
      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
        <li>Generic dashboard preview and marketing hero imagery</li>
        <li>Social-login and testimonial rows not used (Neon email/password)</li>
        <li>Border-beam / motion chrome conflicts with vault legal tone</li>
        <li>No iam-check BrandMark or trust-notice column</li>
      </ul>
      <p className="mt-6 text-sm text-foreground">
        Matrix winner:{" "}
        <span className="font-medium">PortalAuthLayout + Neon AuthView</span>
      </p>
    </div>
  );
}
