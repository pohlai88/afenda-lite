"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ClientShell } from "@/components/client-shell";
import { clientRouteUsesSidebar } from "@/lib/client-nav";

export function ClientRouteShell({
  children,
  embed = false,
}: {
  children: ReactNode;
  embed?: boolean;
}) {
  const pathname = usePathname();
  const useSidebar = !embed && clientRouteUsesSidebar(pathname);

  if (!useSidebar) {
    return children;
  }

  return <ClientShell>{children}</ClientShell>;
}
