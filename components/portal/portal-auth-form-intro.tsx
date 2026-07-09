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
  /** When false, only alternate links and hints render — Neon owns the vault card title. */
  showVaultHeading?: boolean;
  /**
   * Guardian cinematic chamber — tighter stack so the poster can breathe.
   * Keeps a11y heading; drops long description when Neon AuthView already explains.
   */
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
        <div
          className={cn(
            "space-y-1 text-center",
            compact ? "lg:text-center" : "lg:text-right",
          )}
        >
          <h2
            id={signInHeadingId}
            className={cn(
              "font-heading font-semibold tracking-tight text-balance",
              compact ? "sr-only" : "text-base sm:text-lg",
            )}
          >
            {signInTitle}
          </h2>
          {!compact ? (
            <p className="text-body text-muted-foreground text-pretty">
              {signInDescription}
            </p>
          ) : null}
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

      <p
        className={cn(
          "text-caption text-muted-foreground text-center",
          compact ? "lg:text-center" : "lg:text-right",
        )}
      >
        <Link href={alternateLink.href} className="portal-auth-alt-link">
          {alternateLink.label}
        </Link>
      </p>

      {footerHint && !compact ? (
        <p className="text-center text-caption text-muted-foreground text-pretty lg:text-right">
          {footerHint}
        </p>
      ) : null}
    </div>
  );
}
