import "server-only";

import type { ReactNode } from "react";

import { requireClientSession } from "@/lib/auth/session";

/**
 * Client workspace chrome is deferred with the rebuild slice.
 * Session gate: incomplete clients must reach `/client/onboarding` stub,
 * so onboarding is not required here.
 */
export async function runClientWorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireClientSession({ requireOnboarding: false });
  return children;
}
