"use client";

import type { ReactNode } from "react";
import {
  PortalAccessSlot,
  PortalAtmosphere,
  PortalEditorialHero,
  PortalGuardianOwl,
  PortalSealLine,
  type PortalAtmosphereTheme,
} from "@/components/portal-atmosphere";
import { BrandLogo } from "@/components/portal/portal-brand-mark";
import { PortalThemeToggle } from "@/components/portal/portal-theme-toggle";
import { useThemeControls } from "@/components/theme-provider";
import { ShieldCheckIcon } from "lucide-react";

function resolveAtmosphereTheme(
  resolvedTheme: string | undefined,
): PortalAtmosphereTheme {
  return resolvedTheme === "dark" ? "dark" : "light";
}

function PortalAuthDefaultBrand({ theme }: { theme: PortalAtmosphereTheme }) {
  return (
    <>
      <PortalEditorialHero theme={theme} />
      <PortalSealLine showSeal />
    </>
  );
}

/**
 * Auth route adapter (PA-P10 wiring).
 *
 * Composes production `PortalAtmosphere` with PA-P8 layout slots.
 * Neon Auth UI is injected only as `PortalAccessSlot` children — never imported
 * into `components/portal-atmosphere/`.
 */
export function PortalAuthLayout({
  children,
  headerExtra,
  brandPanel,
}: {
  children: ReactNode;
  headerExtra?: ReactNode;
  /** Replaces the default TRUTH / IS / PROTECTED poster on large screens. */
  brandPanel?: ReactNode;
}) {
  const { resolvedTheme } = useThemeControls();
  const theme = resolveAtmosphereTheme(resolvedTheme);

  return (
    <>
      <a href="#neon-auth-view" className="portal-skip-link">
        Skip to sign in
      </a>

      <PortalAtmosphere
        theme={theme}
        header={
          <div className="portal-auth-toolbar w-full shrink-0">
            <div className="portal-auth-toolbar-inner">
              <BrandLogo href="/" context="toolbar" showName priority />
              <PortalThemeToggle />
            </div>
          </div>
        }
        layers={<PortalGuardianOwl showOwl theme={theme} />}
        brand={brandPanel ?? <PortalAuthDefaultBrand theme={theme} />}
        accessSlot={
          <PortalAccessSlot>
            <section
              id="sign-in"
              aria-label="Sign in"
              className="portal-auth-neon-slot"
            >
              {headerExtra}
              <div id="neon-auth-view" className="portal-neon-view w-full max-w-sm">
                {children}
              </div>
            </section>
            <footer className="portal-auth-footer">
              <p className="portal-auth-footer-note">
                <ShieldCheckIcon
                  aria-hidden="true"
                  className="size-3 shrink-0 text-primary"
                />
                <span>
                  Protected access · Encrypted transport · Organization-managed
                  declarations
                </span>
              </p>
            </footer>
          </PortalAccessSlot>
        }
      />
    </>
  );
}
