"use client";

import {
  AccountView,
  AuthView,
  InputFieldSkeleton,
} from "@neondatabase/auth/react/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { useMounted } from "@/hooks/use-mounted";

type NeonViewVariant = "auth" | "account";

const NEON_VIEW_SHELL = {
  auth: {
    ariaLabel: "Loading sign-in form",
    fieldCount: 2,
    footer: "submit",
  },
  account: {
    ariaLabel: "Loading account settings",
    fieldCount: 2,
    footer: "panel",
  },
} as const satisfies Record<
  NeonViewVariant,
  { ariaLabel: string; fieldCount: number; footer: "submit" | "panel" }
>;

function PortalNeonViewSkeleton({ variant }: { variant: NeonViewVariant }) {
  const { fieldCount, footer } = NEON_VIEW_SHELL[variant];

  return (
    <div className="v-stack gap-4">
      {Array.from({ length: fieldCount }, (_, index) => (
        <InputFieldSkeleton key={index} />
      ))}
      {footer === "submit" ? (
        <Skeleton className="h-11 w-full" />
      ) : (
        <Skeleton className="h-24 w-full" />
      )}
    </div>
  );
}

function PortalNeonMountedView({
  variant,
  pathname,
}: {
  variant: NeonViewVariant;
  pathname: string;
}) {
  const mounted = useMounted();
  const { ariaLabel } = NEON_VIEW_SHELL[variant];

  if (!mounted) {
    return (
      <div aria-busy="true" aria-label={ariaLabel}>
        <PortalNeonViewSkeleton variant={variant} />
      </div>
    );
  }

  if (variant === "auth") {
    return <AuthView pathname={pathname} />;
  }

  return <AccountView pathname={pathname} />;
}

export function PortalNeonAuthView({ pathname }: { pathname: string }) {
  return <PortalNeonMountedView variant="auth" pathname={pathname} />;
}

export function PortalNeonAccountView({ pathname }: { pathname: string }) {
  return <PortalNeonMountedView variant="account" pathname={pathname} />;
}
