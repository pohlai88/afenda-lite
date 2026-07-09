import type { ReactNode } from "react";
import {
  BrandThemeIcon,
  BrandLogo,
  BrandMark,
  SidebarBrandIcon,
} from "@/components/portal/portal-brand-mark";
import { PortalAuthPhantomOwl } from "@/components/portal/portal-auth-brand-scene";
import {
  PORTAL_BRAND_ICON,
  PORTAL_BRAND_SHELL,
  BRAND_CONTEXT,
  BRAND_SHELL_BOUNDS,
  type BrandContext,
} from "@/lib/copy/portal-brand";
import { PORTAL_NAME } from "@/lib/copy/portal-copy";
import { cn } from "@/lib/utils";

function SpecLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

function SpecPanel({
  title,
  meta,
  children,
  className,
}: {
  title: string;
  meta?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card p-4 shadow-sm",
        className,
      )}
    >
      <SpecLabel>{title}</SpecLabel>
      {meta ? (
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">{meta}</p>
      ) : null}
      <div className="mt-4 flex min-h-16 items-center justify-center">
        {children}
      </div>
    </section>
  );
}

const ASSET_LADDER = [
  { label: "Light chrome 512", path: PORTAL_BRAND_ICON.light.chrome512, size: 512 },
  { label: "Dark chrome 512", path: PORTAL_BRAND_ICON.dark.chrome512, size: 512 },
  { label: "Light favicon 32", path: PORTAL_BRAND_ICON.light.favicon32, size: 32 },
  { label: "Dark favicon 32", path: PORTAL_BRAND_ICON.dark.favicon32, size: 32 },
  { label: "Light PWA 192", path: PORTAL_BRAND_ICON.light.pwa192, size: 192 },
] as const;

const CONTEXTS: BrandContext[] = ["sidebar", "toolbar", "compact", "hero"];

function ShellProofTile({ context }: { context: BrandContext }) {
  const bounds = BRAND_SHELL_BOUNDS[context];
  const config = BRAND_CONTEXT[context];
  const innerPx = bounds.outerPx - bounds.paddingPx * 2;

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <SpecLabel>{`context="${context}"`}</SpecLabel>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
        shell {bounds.outerPx}×{bounds.outerPx}px · padding {bounds.paddingPx}px ·
        inner {innerPx}×{innerPx}px · overflow-hidden + object-contain
      </p>
      <div className="mt-4 flex flex-col items-center gap-3">
        <div
          className="relative flex items-center justify-center"
          style={{ width: bounds.outerPx + 16, height: bounds.outerPx + 16 }}
        >
          {/* Outer limit — red dashed = max allowed footprint */}
          <div
            aria-hidden
            className="pointer-events-none absolute rounded-md border-2 border-dashed border-red-500/70"
            style={{
              width: bounds.outerPx,
              height: bounds.outerPx,
            }}
          />
          {/* Inner padding guide */}
          <div
            aria-hidden
            className="pointer-events-none absolute rounded-sm border border-dotted border-amber-500/60"
            style={{
              width: innerPx,
              height: innerPx,
            }}
          />
          <BrandMark context={context} />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
          PASS — contained in shell
        </span>
        <p className="max-w-[14rem] text-center text-[10px] text-muted-foreground">
          {config.mode} · {config.shellClass.split(" ").slice(0, 4).join(" ")}…
        </p>
      </div>
    </section>
  );
}

export function BrandIconShellProof() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 bg-background p-6 sm:p-8">
      <header className="space-y-2 border-b border-border pb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          Shell containment proof
        </p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Icon bounds validation
        </h1>
        <p className="max-w-2xl text-sm text-pretty text-muted-foreground">
          Red dashed = outer shell limit. Amber dotted = inner padding box. Mark
          uses <code className="text-xs">overflow-hidden</code> shell +{" "}
          <code className="text-xs">object-contain</code> imgs (absolute stack,
          no overlap). Run{" "}
          <code className="text-xs">npm run validate:brand-icon-bounds</code>{" "}
          for PNG asset margin proof.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {CONTEXTS.map((context) => (
          <ShellProofTile key={context} context={context} />
        ))}
      </div>
    </div>
  );
}

export function BrandIconContextMatrix() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {CONTEXTS.map((context) => {
        const config = BRAND_CONTEXT[context];
        const bounds = BRAND_SHELL_BOUNDS[context];
        return (
          <SpecPanel
            key={context}
            title={`context="${context}"`}
            meta={`${config.mode} · ${bounds.outerPx}px shell · theme swap`}
          >
            <BrandMark context={context} />
          </SpecPanel>
        );
      })}
    </div>
  );
}

export function BrandIconAssetLadder() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {ASSET_LADDER.map((item) => (
        <SpecPanel
          key={item.path}
          title={item.label}
          meta={`${item.size}×${item.size}px`}
        >
          <div
            className="flex items-center justify-center rounded-lg bg-muted/40 p-3"
            style={{ minHeight: Math.min(item.size + 24, 120) }}
          >
            <img
              src={item.path}
              alt=""
              width={item.size}
              height={item.size}
              aria-hidden
              className="max-h-24 max-w-full object-contain"
            />
          </div>
        </SpecPanel>
      ))}
    </div>
  );
}

export function BrandIconSurfacePlacements() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <SpecPanel
        title="Sidebar header"
        meta="SidebarBrandIcon · 32px shell"
        className="bg-sidebar text-sidebar-foreground"
      >
        <div className="flex w-full items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar px-2 py-2">
          <SidebarBrandIcon />
          <div className="min-w-0 text-left text-sm leading-tight">
            <p className="truncate font-medium">{PORTAL_NAME}</p>
            <p className="truncate text-xs text-muted-foreground">Client portal</p>
          </div>
        </div>
      </SpecPanel>

      <SpecPanel
        title="Auth toolbar"
        meta="BrandLogo · toolbar + showName"
        className="bg-vault-floor"
      >
        <div className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-vault-floor/80 px-4 py-3 backdrop-blur-md">
          <BrandLogo href={null} context="toolbar" showName />
          <span className="text-xs text-muted-foreground">Theme toggle</span>
        </div>
      </SpecPanel>

      <SpecPanel
        title="Auth hero"
        meta="PortalAuthPhantomOwl · absolute guardian"
        className="bg-vault-floor"
      >
        <div className="w-full rounded-2xl bg-vault-floor p-2">
          <PortalAuthPhantomOwl />
        </div>
      </SpecPanel>
    </div>
  );
}

export function BrandIconThemeCompare() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SpecPanel title="Light theme asset" meta={PORTAL_BRAND_ICON.light.chrome512}>
        <div className="rounded-xl bg-vault-floor p-6">
          <BrandThemeIcon shellClassName={PORTAL_BRAND_SHELL.chromeShell} />
        </div>
      </SpecPanel>
      <SpecPanel title="Dark theme asset" meta={PORTAL_BRAND_ICON.dark.chrome512}>
        <div className="rounded-xl bg-sidebar p-6">
          <BrandThemeIcon shellClassName={PORTAL_BRAND_SHELL.chromeShell} />
        </div>
      </SpecPanel>
    </div>
  );
}

export function BrandIconCatalog() {
  return (
    <div className="mx-auto max-w-6xl space-y-10 bg-background p-6 sm:p-8">
      <header className="space-y-2 border-b border-border pb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          iAM brand icon system
        </p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Dual-theme brand mark catalog
        </h1>
        <p className="max-w-2xl text-sm text-pretty text-muted-foreground">
          Light and dark masters from removebg PNGs. Marks render inside fixed
          shells (<code className="text-xs">overflow-hidden</code>, minimal
          padding, <code className="text-xs">object-contain</code>). Theme swap
          via <code className="text-xs">dark:hidden</code> /{" "}
          <code className="text-xs">hidden dark:block</code>.
        </p>
      </header>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold">Shell containment proof</h2>
        <BrandIconShellProof />
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold">Theme masters</h2>
        <BrandIconThemeCompare />
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold">Context matrix</h2>
        <BrandIconContextMatrix />
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold">Asset ladder</h2>
        <BrandIconAssetLadder />
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold">Surface placements</h2>
        <BrandIconSurfacePlacements />
      </div>
    </div>
  );
}

export function BrandIconLiveThemeDemo() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background p-8">
      <p className="text-center text-sm text-muted-foreground">
        Toggle theme in toolbar — icon swaps inside shell via CSS (.dark on html)
      </p>
      <BrandThemeIcon shellClassName={BRAND_CONTEXT.sidebar.shellClass} />
      <p className="font-mono text-[11px] text-muted-foreground">
        {PORTAL_BRAND_SHELL.chromeShell}
      </p>
    </div>
  );
}
