import "server-only";

import { cache } from "react";
import { auth } from "@/lib/auth/server";
import type { AuthSession } from "@/lib/auth/types";

/** Request-scoped Neon Auth session lookup (dedupes within a single RSC render). */
export const getAuthSession = cache(async (): Promise<AuthSession | null> => {
  const { data: session } = await auth.getSession();
  return session ?? null;
});
