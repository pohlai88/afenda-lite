import Link from "next/link";
import type { AuthShellCopy } from "@/lib/auth-shell-copy";

type PortalAuthFormIntroProps = Pick<
  AuthShellCopy,
  | "signInTitle"
  | "signInDescription"
  | "alternateLink"
  | "signInHeadingId"
  | "footerHint"
  | "constraintHint"
> & {
  /** When false, only alternate links and hints render — Neon owns the vault card title. */
  showVaultHeading?: boolean;
};

/** Portal-owned headings above Neon AuthView — restores copy smoke/E2E and a11y targets. */
export function PortalAuthFormIntro({
  signInTitle,
  signInDescription,
  alternateLink,
  signInHeadingId,
  footerHint,
  constraintHint,
  showVaultHeading = true,
}: PortalAuthFormIntroProps) {
  return (
    <div className="flex w-full flex-col gap-4">
      {showVaultHeading ? (
        <div className="space-y-1 text-center lg:text-right">
          <h2
            id={signInHeadingId}
            className="font-heading text-base font-semibold tracking-tight text-balance sm:text-lg"
          >
            {signInTitle}
          </h2>
          <p className="text-body text-muted-foreground text-pretty">
            {signInDescription}
          </p>
          {constraintHint ? (
            <p className="text-caption text-muted-foreground text-pretty">
              {constraintHint}
            </p>
          ) : null}
        </div>
      ) : constraintHint ? (
        <p className="text-center text-caption text-muted-foreground text-pretty lg:text-right">
          {constraintHint}
        </p>
      ) : null}

      <p className="text-center text-caption text-muted-foreground lg:text-right">
        <Link href={alternateLink.href} className="portal-auth-alt-link">
          {alternateLink.label}
        </Link>
      </p>

      {footerHint ? (
        <p className="text-center text-caption text-muted-foreground text-pretty lg:text-right">
          {footerHint}
        </p>
      ) : null}
    </div>
  );
}
