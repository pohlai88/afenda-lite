import { AccountView } from "@neondatabase/auth/react/ui";
import { accountViewPaths } from "@neondatabase/auth/react/ui/server";
import Link from "next/link";
import { PortalEyebrow } from "@/components/portal-eyebrow";
import { PortalThemeToggle } from "@/components/portal-theme-toggle";
import { UserButton } from "@/components/user-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/server";
import { portalCopy, PORTAL_NAME } from "@/lib/portal-copy";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
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
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  const { org, product } = portalCopy;
  const title =
    path === "security" ? "Security & password" : "Account settings";

  return (
    <div className="portal-shell">
      <header className="portal-header">
        <div className="portal-header-inner max-w-3xl">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground" translate="no">
              {PORTAL_NAME}
            </p>
            <PortalEyebrow className="mb-1">{product.portalEyebrow}</PortalEyebrow>
            <h1 className="text-lg font-semibold tracking-tight">{org.title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
              render={<Link href="/dashboard" />}
              nativeButton={false}
            >
              {org.title}
            </Button>
            <PortalThemeToggle />
            <UserButton />
          </div>
        </div>
      </header>
      <main className="portal-main max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              Manage your profile, password, and active sessions.
            </CardDescription>
          </CardHeader>
          <CardContent className="portal-neon-account-view">
            <AccountView pathname={path} />
          </CardContent>
        </Card>
        <div className="flex gap-3 text-sm">
          <Link
            href="/account/settings"
            className={path === "settings" ? "font-medium text-primary" : "text-muted-foreground hover:text-foreground"}
          >
            Settings
          </Link>
          <Link
            href="/account/security"
            className={path === "security" ? "font-medium text-primary" : "text-muted-foreground hover:text-foreground"}
          >
            Security
          </Link>
        </div>
      </main>
    </div>
  );
}
