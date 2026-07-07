"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { PortalAuthPhantomOwl } from "@/components/portal-auth-brand-scene";
import { BrandLogo, BrandMark } from "@/components/portal-brand-mark";
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

      {/* ── Background layers (z-order: atmosphere → glow → grid → phantom owl) */}
      <div aria-hidden="true" className="portal-auth-atmosphere" />
      <div aria-hidden="true" className="portal-auth-gridlines" />
      <PortalAuthPhantomOwl />

      {/* ── Toolbar ── */}
      <header className="portal-auth-toolbar shrink-0">
        <div className="portal-auth-toolbar-inner">
          <BrandLogo href="/" context="toolbar" showName priority />
          <PortalThemeToggle />
        </div>
      </header>

      {/* ── Content stage ── */}
      <div className="portal-auth-stage">
        <div className="portal-auth-grid">

          {/* Left column — text floats above the phantom owl */}
          <section
            aria-labelledby="auth-brand-heading"
            className="portal-auth-brand max-lg:order-2"
          >
            {/* Flexible spacer — gives owl visual breathing room above text */}
            <div
              aria-hidden
              className="portal-auth-brand-spacer"
            />

            <Badge variant="outline" className="portal-auth-eyebrow">
              {eyebrow}
            </Badge>

            <h1 id="auth-brand-heading">{heroTitle}</h1>

            <p className="portal-auth-hero-description">{heroDescription}</p>

            <ul className="portal-auth-vault-signals">
              {trust.vaultSignals.map((signal) => (
                <li key={signal} className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="portal-auth-vault-signal-dot" />
                  {signal}
                </li>
              ))}
            </ul>
          </section>

          {/* Right column — login card — dominant focal point */}
          <section
            id="sign-in"
            aria-labelledby={signInHeadingId}
            className="portal-auth-chamber-wrap max-lg:order-1"
          >
            <div className="portal-auth-chamber">
              <div className="portal-auth-chamber-inner">
                <div className="portal-auth-emblem">
                  <BrandMark context="hero" />
                </div>

                <header className="min-w-0 space-y-1 text-center sm:text-left">
                  <h2 id={signInHeadingId}>{signInTitle}</h2>
                  <p className="portal-auth-sign-in-description">{signInDescription}</p>
                </header>

                {headerExtra}

                <p className="portal-auth-trust-notice">{trustNotice}</p>

                <div className="portal-auth-form">{form}</div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between lg:gap-3">
                  {footerHint ? (
                    <p className="portal-auth-footer-hint">{footerHint}</p>
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
        <p className="portal-auth-footer-note">
          <ShieldCheckIcon aria-hidden="true" className="size-3 shrink-0 text-primary" />
          <span>{trust.footer.complianceNote}</span>
        </p>
      </footer>
    </main>
  );
}
