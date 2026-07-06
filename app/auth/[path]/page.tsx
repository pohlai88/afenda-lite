import Link from "next/link";
import { AuthView } from "@neondatabase/auth/react";
import { authViewPaths } from "@neondatabase/auth/react/ui/server";
import { PortalNarrowShell } from "@/components/portal-narrow-shell";
import { portalCopy } from "@/lib/portal-copy";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  return (
    <PortalNarrowShell backHref="/" backLabel={portalCopy.signIn.title} centered>
      <div className="mx-auto w-full max-w-sm">
        <AuthView path={path} />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {portalCopy.clientAuth.operatorLink}{" "}
          <Link
            href="/client/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {portalCopy.clientAuth.title}
          </Link>
        </p>
      </div>
    </PortalNarrowShell>
  );
}
