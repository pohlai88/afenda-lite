"use client";

import { AuthView, InputFieldSkeleton } from "@neondatabase/auth-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { useMounted } from "@/components/hooks/use-mounted";

function PortalAuthNeonSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading authentication form"
      className="flex w-full flex-col gap-4"
    >
      <InputFieldSkeleton />
      <InputFieldSkeleton />
      <Skeleton className="h-11 w-full rounded-md" />
    </div>
  );
}

export function PortalAuthNeonView({
  pathname,
  redirectTo,
  callbackURL,
}: {
  pathname: string;
  redirectTo?: string;
  callbackURL?: string;
}) {
  const mounted = useMounted();

  if (!mounted) {
    return <PortalAuthNeonSkeleton />;
  }

  return (
    <div className="portal-neon-view w-full">
      <AuthView
        pathname={pathname}
        redirectTo={redirectTo}
        callbackURL={callbackURL}
      />
    </div>
  );
}
