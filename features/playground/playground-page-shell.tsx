import Link from "next/link";
import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components-V2/platform-components/ui/card";
import { cn } from "@/modules/platform/utils";
import { playgroundReviewNavLinks } from "@/features/playground/playground-nav";

type PlaygroundPageShellProps = {
  title: string;
  description: ReactNode;
  /** Active review-mode href for tab highlight. */
  activeHref?: string;
  /** Optional strip under the title (coverage, category counts). */
  meta?: ReactNode;
  skipLinkHref?: string;
  skipLinkLabel?: string;
  children: ReactNode;
  className?: string;
};

/**
 * Single composition for playground review pages — one card, no mixed frames.
 */
export function PlaygroundPageShell({
  title,
  description,
  activeHref,
  meta,
  skipLinkHref,
  skipLinkLabel = "Skip to content",
  children,
  className,
}: PlaygroundPageShellProps) {
  return (
    <div className={cn("min-w-0", className)}>
      {skipLinkHref ? (
        <a href={skipLinkHref} className="portal-skip-link">
          {skipLinkLabel}
        </a>
      ) : null}

      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="border-b">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Playground · local dev only
          </p>
          <CardTitle className="font-heading text-2xl font-semibold tracking-tight">
            {title}
          </CardTitle>
          <CardDescription className="max-w-3xl">{description}</CardDescription>

          {activeHref ? (
            <nav
              aria-label="Playground review modes"
              className="mt-3 flex flex-wrap gap-2"
            >
              {playgroundReviewNavLinks.map((item) => {
                const active = item.href === activeHref;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                        : "rounded-md border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          ) : null}

          {meta ? <div className="mt-3 flex flex-wrap gap-2">{meta}</div> : null}
        </CardHeader>

        <CardContent className="pt-(--card-spacing)">{children}</CardContent>
      </Card>
    </div>
  );
}
