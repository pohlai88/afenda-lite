"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { PortalBrandLogo, PortalBrandMark } from "@/components/portal-brand-mark";
import { PortalThemeToggle } from "@/components/portal-theme-toggle";
import { Badge } from "@/components/ui/badge";
import { portalCopy } from "@/lib/portal-copy";
import { cn } from "@/lib/utils";
import { ShieldCheckIcon } from "lucide-react";

export function PortalAuthLayout({
  eyebrow,
  heroTitle,
  heroDescription,
  signInTitle,
  signInDescription,
  trustNotice,
  alternateLink,
  form,
  footerHint,
  headerExtra,
  signInHeadingId = "sign-in-heading",
}: {
  eyebrow: string;
  heroTitle: string;
  heroDescription: string;
  signInTitle: string;
  signInDescription: string;
  trustNotice: string;
  alternateLink: { href: string; label: string };
  form: ReactNode;
  footerHint?: string;
  headerExtra?: ReactNode;
  signInHeadingId?: string;
}) {
  const { trust } = portalCopy;

  return (
    <main className="portal-auth-vault">
      <a href={`#${signInHeadingId}`} className="portal-skip-link">
        Skip to sign in
      </a>

      <div aria-hidden="true" className="portal-auth-atmosphere" />
      <div aria-hidden="true" className="portal-auth-gridlines" />

      <header className="portal-auth-toolbar shrink-0">
        <div className="portal-auth-toolbar-inner">
          <PortalBrandLogo href="/" size="sm" showName priority />
          <PortalThemeToggle />
        </div>
      </header>

      <div className="portal-auth-stage">
        <div className="portal-auth-grid">
          <section
            aria-labelledby="auth-brand-heading"
            className="portal-auth-brand max-lg:order-2"
          >
            <div className="portal-auth-brand-mark">
              <PortalBrandMark size="hero" priority className="shadow-[0_0_48px_var(--vault-glow)]" />
            </div>

            <Badge
              variant="outline"
              className="portal-auth-eyebrow mb-3 border-vault-rim bg-vault-surface/50 text-foreground backdrop-blur-sm lg:mb-2"
            >
              {eyebrow}
            </Badge>

            <h1
              id="auth-brand-heading"
              className="font-heading text-3xl font-semibold leading-[1.1] tracking-tight text-balance sm:text-4xl lg:text-[2.375rem] xl:text-4xl"
            >
              {heroTitle}
            </h1>

            <p className="mt-3 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base lg:mt-2.5 lg:text-[0.9375rem] lg:leading-snug">
              {heroDescription}
            </p>

            <ul className="mt-5 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-muted-foreground sm:text-sm lg:mt-4">
              {trust.vaultSignals.map((signal) => (
                <li key={signal} className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--vault-glow)]"
                  />
                  {signal}
                </li>
              ))}
            </ul>
          </section>

          <section
            id="sign-in"
            aria-labelledby={signInHeadingId}
            className="portal-auth-chamber-wrap max-lg:order-1"
          >
            <div className="portal-auth-chamber">
              <div className="portal-auth-chamber-inner">
                <div className="flex flex-col items-center gap-3 sm:items-start lg:flex-row lg:items-center lg:gap-3">
                  <div className="portal-auth-emblem shrink-0">
                    <PortalBrandMark size="xs" className="size-9 ring-primary/25 lg:size-8" />
                  </div>

                  <header className="min-w-0 space-y-1 text-center sm:text-left">
                    <h2
                      id={signInHeadingId}
                      className="font-heading text-xl font-semibold tracking-tight text-balance sm:text-2xl lg:text-[1.375rem]"
                    >
                      {signInTitle}
                    </h2>
                    <p className="text-pretty text-xs leading-snug text-muted-foreground sm:text-sm lg:text-[0.8125rem]">
                      {signInDescription}
                    </p>
                  </header>
                </div>

                {headerExtra}

                <p className="rounded-md border border-border/80 bg-muted/40 px-3 py-2 text-pretty text-[11px] leading-snug text-muted-foreground sm:text-xs lg:py-1.5">
                  {trustNotice}
                </p>

                <div className="portal-auth-form">{form}</div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:gap-3">
                  {footerHint ? (
                    <p className="text-center text-[11px] leading-snug text-muted-foreground text-pretty sm:text-left sm:text-xs">
                      {footerHint}
                    </p>
                  ) : (
                    <span className="hidden sm:block" />
                  )}

                  <p
                    className={cn(
                      "text-center text-sm sm:text-right",
                      !footerHint && "sm:flex-1 sm:text-center lg:text-left",
                    )}
                  >
                    <Link href={alternateLink.href} className="portal-auth-alt-link">
                      {alternateLink.label}
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <footer className="portal-auth-footer">
        <p className="inline-flex items-center justify-center gap-2 text-[11px] text-muted-foreground sm:text-xs">
          <ShieldCheckIcon aria-hidden="true" className="size-3 shrink-0 text-primary" />
          <span>{trust.footer.complianceNote}</span>
        </p>
      </footer>
    </main>
  );
}
