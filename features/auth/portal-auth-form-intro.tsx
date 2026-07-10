import Link from "next/link";
import type { AuthShellCopy } from "@/lib/copy/auth-shell-copy";
import { cn } from "@/lib/utils";

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

/** Portal-owned headings above Neon AuthView — restores copy smoke/E2E and a11y targets. */
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
      ) : constraintHint ? (
        <p className="text-center text-sm text-muted-foreground text-pretty sm:text-left">
          {constraintHint}
        </p>
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
