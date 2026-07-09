"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ClientShell } from "@/components/client/client-shell";
import { clientRouteUsesSidebar } from "@/lib/client-nav";
import type { PortalMember } from "@/lib/portal-member-types";

export function ClientRouteShell({
  children,
  embed = false,
  member = null,
}: {
  children: ReactNode;
  embed?: boolean;
  member?: PortalMember | null;
}) {
  const pathname = usePathname();
  const useSidebar = !embed && clientRouteUsesSidebar(pathname);

  if (!useSidebar) {
    return children;
  }

  return <ClientShell member={member}>{children}</ClientShell>;
}
