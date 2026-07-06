import Link from "next/link";
import { AccountView } from "@neondatabase/auth/react";
import { accountViewPaths } from "@neondatabase/auth/react/ui/server";
import { PortalEyebrow } from "@/components/portal-eyebrow";
import { PortalThemeToggle } from "@/components/portal-theme-toggle";
import { UserButton } from "@/components/user-button";
import { Button } from "@/components/ui/button";
import { portalCopy, PORTAL_NAME } from "@/lib/portal-copy";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(accountViewPaths).map((path) => ({ path }));
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;
  const { account, product } = portalCopy;

  return (
    <div className="portal-shell">
      <header className="portal-header">
        <div className="portal-header-inner max-w-3xl">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground" translate="no">
              {PORTAL_NAME}
            </p>
            <PortalEyebrow className="mb-1">{product.portalEyebrow}</PortalEyebrow>
            <h1 className="text-lg font-semibold tracking-tight">{account.title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              render={<Link href="/dashboard" />}
              nativeButton={false}
            >
              {account.title}
            </Button>
            <PortalThemeToggle />
            <UserButton />
          </div>
        </div>
      </header>
      <main className="portal-main max-w-3xl">
        <AccountView path={path} />
      </main>
    </div>
  );
}
