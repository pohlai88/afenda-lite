import { PortalAuthLayout } from "@/components/portal-auth-layout";
import { PortalAuthEmailTrustNotice } from "@/components/portal-auth-email-trust-notice";
import { PortalInvitationJoinBrandPanel } from "@/components/portal-invitation-join-brand-panel";
import { PortalInvitationJoinSteps } from "@/components/portal-invitation-join-steps";
import { portalCopy } from "@/lib/portal-copy";

/** Mock sign-in card for Storybook — mirrors Neon AuthView card chrome without provider. */
function MockNeonAuthCard() {
  const { signIn } = portalCopy;

  return (
    <div className="bg-card text-card-foreground flex w-full max-w-sm flex-col gap-6 rounded-xl border py-6 shadow-sm">
      <div className="grid auto-rows-min grid-rows-[auto_auto] gap-1.5 px-6">
        <div className="font-semibold text-lg md:text-xl">{signIn.title}</div>
        <div className="text-muted-foreground text-xs md:text-sm">{signIn.description}</div>
      </div>
      <div className="grid gap-6 px-6">
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm">
            <span className="font-medium">{signIn.emailLabel}</span>
            <input
              className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
              placeholder={signIn.emailPlaceholder}
              readOnly
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="font-medium">{signIn.passwordLabel}</span>
            <input
              className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
              type="password"
              placeholder="Password"
              readOnly
            />
          </label>
          <button
            type="button"
            className="bg-primary text-primary-foreground inline-flex h-9 w-full items-center justify-center rounded-md text-sm font-medium"
          >
            {signIn.submit}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Mock OTP verification card for Storybook — mirrors Neon Email OTP step chrome. */
function MockNeonOtpCard() {
  const { emailOtp } = portalCopy;

  return (
    <div className="bg-card text-card-foreground flex w-full max-w-sm flex-col gap-6 rounded-xl border py-6 shadow-sm">
      <div className="grid auto-rows-min grid-rows-[auto_auto] gap-1.5 px-6">
        <div className="font-semibold text-lg md:text-xl">{emailOtp.label}</div>
        <div className="text-muted-foreground text-xs md:text-sm">
          {emailOtp.enterCodeDescription}
        </div>
      </div>
      <div className="grid gap-6 px-6">
        <div className="flex justify-center gap-2" aria-hidden>
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="flex h-11 w-10 items-center justify-center rounded-md border border-border bg-background text-base font-medium"
            >
              {index === 0 ? "4" : ""}
            </div>
          ))}
        </div>
        <button
          type="button"
          className="bg-primary text-primary-foreground inline-flex h-9 w-full items-center justify-center rounded-md text-sm font-medium"
        >
          {emailOtp.verifyCodeAction}
        </button>
        <p className="text-center text-caption text-muted-foreground">
          {emailOtp.codeSentNotice}
        </p>
      </div>
    </div>
  );
}

/** Production iam-check auth shell — editorial poster + Neon Auth card slot. */
export function IamCheckAuthShellPreview() {
  return (
    <PortalAuthLayout>
      <MockNeonAuthCard />
    </PortalAuthLayout>
  );
}

/** Vault shell with Email OTP verification step mock. */
export function IamCheckAuthOtpShellPreview() {
  return (
    <PortalAuthLayout>
      <MockNeonOtpCard />
    </PortalAuthLayout>
  );
}

/** Mock magic-link card for Storybook — mirrors Neon Magic Link step chrome. */
function MockNeonMagicLinkCard() {
  const { magicLink, signIn } = portalCopy;

  return (
    <div className="bg-card text-card-foreground flex w-full max-w-sm flex-col gap-6 rounded-xl border py-6 shadow-sm">
      <div className="grid auto-rows-min grid-rows-[auto_auto] gap-1.5 px-6">
        <div className="font-semibold text-lg md:text-xl">{magicLink.label}</div>
        <div className="text-muted-foreground text-xs md:text-sm">
          {magicLink.signInDescription}
        </div>
      </div>
      <div className="grid gap-6 px-6">
        <label className="grid gap-2 text-sm">
          <span className="font-medium">{signIn.emailLabel}</span>
          <input
            className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm"
            placeholder={signIn.emailPlaceholder}
            readOnly
          />
        </label>
        <button
          type="button"
          className="bg-primary text-primary-foreground inline-flex h-9 w-full items-center justify-center rounded-md text-sm font-medium"
        >
          {magicLink.sendLinkAction}
        </button>
        <p className="text-center text-caption text-muted-foreground">
          {magicLink.existingUsersOnlyHint}
        </p>
      </div>
    </div>
  );
}

/** Vault shell with Magic Link sign-in step mock. */
export function IamCheckAuthMagicLinkShellPreview() {
  return (
    <PortalAuthLayout>
      <MockNeonMagicLinkCard />
    </PortalAuthLayout>
  );
}

/** Mock accept-invitation card for Storybook — organization join step. */
function MockNeonAcceptInvitationCard() {
  const { organizationAuth } = portalCopy;

  return (
    <div className="bg-card text-card-foreground flex w-full max-w-sm flex-col gap-6 rounded-xl border py-6 shadow-sm">
      <div className="grid auto-rows-min grid-rows-[auto_auto] gap-1.5 px-6">
        <div className="font-semibold text-lg md:text-xl">
          {organizationAuth.acceptInvitationTitle}
        </div>
        <div className="text-muted-foreground text-xs md:text-sm">
          {organizationAuth.acceptInvitationDescription}
        </div>
      </div>
      <div className="grid gap-6 px-6">
        <button
          type="button"
          className="bg-primary text-primary-foreground inline-flex h-9 w-full items-center justify-center rounded-md text-sm font-medium"
        >
          {organizationAuth.acceptInvitationTitle}
        </button>
      </div>
    </div>
  );
}

/** Vault shell with organization accept-invitation step mock. */
export function IamCheckAuthOrganizationShellPreview() {
  const { organizationAuth } = portalCopy;

  return (
    <PortalAuthLayout
      brandPanel={<PortalInvitationJoinBrandPanel activeStep={2} />}
      headerExtra={
        <PortalAuthEmailTrustNotice
          message={organizationAuth.trustNotice}
          variant="email"
        />
      }
    >
      <div className="flex w-full flex-col gap-4">
        <PortalInvitationJoinSteps activeStep={2} variant="compact" className="lg:hidden" />
        <MockNeonAcceptInvitationCard />
      </div>
    </PortalAuthLayout>
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
