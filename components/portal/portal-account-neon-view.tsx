"use client";

import { AccountView } from "@neondatabase/auth-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { useMounted } from "@/components/hooks/use-mounted";

function PortalAccountNeonSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading account settings"
      className="flex w-full flex-col gap-4"
    >
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  );
}

/** Neon AccountView — updateUser(name) and changePassword() with portal styling hooks. */
export function PortalAccountNeonView({ pathname }: { pathname: string }) {
  const mounted = useMounted();

  if (!mounted) {
    return <PortalAccountNeonSkeleton />;
  }

  return (
    <div className="portal-neon-view w-full">
      <AccountView pathname={pathname} />
    </div>
  );
}
