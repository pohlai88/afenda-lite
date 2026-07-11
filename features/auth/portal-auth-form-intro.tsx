import Link from "next/link";
import type { AuthShellCopy } from "@/lib/copy/auth-shell-copy";
import { cn } from "@/modules/platform/utils";

type PortalAuthFormIntroProps = Pick<
  AuthShellCopy,
  | "signInTitle"
  | "signInDescription"
  | "alternateLink"
  | "signInHeadingId"
  | "footerHint"
  | "constraintHint"
> & {
  showVaultHeading?: boolean;
  compact?: boolean;
};

/**
 * Portal-owned headings above Neon AuthView.
 * When `showVaultHeading` is false (Studio + Neon default), return null —
 * AuthView already owns title, description, expiry copy, and method links.
 * Org operator sign-in sets `showVaultHeading` true for distinct portal copy.
 * `compact` keeps Guardian/Storybook intro chrome.
 */
export function PortalAuthFormIntro({
  signInTitle,
  signInDescription,
  alternateLink,
  signInHeadingId,
  footerHint,
  constraintHint,
  showVaultHeading = true,
  compact = false,
}: PortalAuthFormIntroProps) {
  if (!showVaultHeading && !compact) {
    return null;
  }

  return (
    <div className={cn("flex w-full flex-col", compact ? "gap-2" : "gap-4")}>
      {showVaultHeading ? (
        <div className={cn("space-y-1 text-center", compact ? "" : "sm:text-left")}>
          <h2
            id={signInHeadingId}
            className={cn(
              "font-heading font-semibold tracking-tight text-balance",
              compact ? "sr-only" : "text-2xl",
            )}
          >
            {signInTitle}
          </h2>
          {!compact ? (
            <p className="text-muted-foreground text-pretty">{signInDescription}</p>
          ) : null}
          {constraintHint ? (
            <p className="text-sm text-muted-foreground text-pretty">{constraintHint}</p>
          ) : null}
        </div>
      ) : null}

      <p className="text-center text-sm text-muted-foreground sm:text-left">
        <Link href={alternateLink.href} className="portal-auth-alt-link">
          {alternateLink.label}
        </Link>
      </p>

      {footerHint && !compact ? (
        <p className="text-center text-sm text-muted-foreground text-pretty sm:text-left">
          {footerHint}
        </p>
      ) : null}
    </div>
  );
}
