"use client";

import type { ReactNode } from "react";
import { PortalAuthPhantomOwl } from "@/components/portal-auth-brand-scene";
import { BrandLogo } from "@/components/portal-brand-mark";
import { PortalThemeToggle } from "@/components/portal-theme-toggle";
import { ShieldCheckIcon } from "lucide-react";

export function PortalAuthLayout({
  children,
  headerExtra,
}: {
  children: ReactNode;
  headerExtra?: ReactNode;
}) {
  return (
    <main className="portal-auth-vault">
      <a href="#neon-auth-view" className="portal-skip-link">
        Skip to sign in
      </a>

      <div aria-hidden="true" className="portal-auth-atmosphere" />
      <div aria-hidden="true" className="portal-auth-gridlines" />
      <PortalAuthPhantomOwl />

      <header className="portal-auth-toolbar shrink-0">
        <div className="portal-auth-toolbar-inner">
          <BrandLogo href="/" context="toolbar" showName priority />
          <PortalThemeToggle />
        </div>
      </header>

      <div className="portal-auth-stage">
        <div className="portal-auth-grid">
          <section aria-label="Declaration portal" className="portal-auth-brand max-lg:hidden">
            <div aria-hidden className="portal-auth-brand-spacer" />

            <div className="portal-hero-stack">
              <h1 className="sr-only">Truth is Protected</h1>

              <div aria-hidden className="portal-hero-heading">
                <span className="portal-hero-word portal-hero-truth">TRUTH</span>

                <div className="portal-hero-connector">
                  <span className="portal-hero-rule" />
                  <span className="portal-hero-is">IS</span>
                  <span className="portal-hero-rule" />
                </div>

                <span className="portal-hero-word portal-hero-protected">PROTECTED</span>
              </div>
            </div>

            <div className="portal-auth-seal-line">
              <ShieldCheckIcon aria-hidden className="portal-auth-seal-icon" />
              <span>SECURE · CONFIDENTIAL · VERIFIED</span>
            </div>
          </section>

          <section
            id="sign-in"
            aria-label="Sign in"
            className="portal-auth-neon-slot max-lg:order-1"
          >
            {headerExtra}
            <div id="neon-auth-view" className="portal-neon-view w-full max-w-sm">
              {children}
            </div>
          </section>
        </div>
      </div>

      <footer className="portal-auth-footer">
        <p className="portal-auth-footer-note">
          <ShieldCheckIcon aria-hidden="true" className="size-3 shrink-0 text-primary" />
          <span>Protected access · Encrypted transport · Organization-managed declarations</span>
        </p>
      </footer>
    </main>
  );
}
