import "server-only";

import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { PlaygroundCoverageBadge } from "@/components/playground-coverage-badge";
import { requireAdminSession } from "@/lib/auth/session";
import { buildRouteCoverageSnapshot } from "@/lib/governance/portal-route-coverage";
import { isPlaygroundEnabled } from "@/lib/playground/playground";

/** Minimal playground chrome after legacy PortalApplicationShell removal. */
export async function runPlaygroundLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!isPlaygroundEnabled()) {
    notFound();
  }

  await requireAdminSession();

  const coverage = buildRouteCoverageSnapshot();

  return (
    <div className="min-h-dvh bg-background p-6">
      <PlaygroundCoverageBadge snapshot={coverage} />
      {children}
    </div>
  );
}
