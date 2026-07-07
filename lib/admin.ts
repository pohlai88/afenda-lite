type AdminSession = {
  user?: {
    id?: string;
    email?: string | null;
    name?: string | null;
    role?: string | null;
  };
} | null | undefined;

export type AdminAuthenticatedSession = {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string | null;
  };
};

/** Canonical redirect when a non-operator hits an operator-only boundary. */
export const ORG_ACCESS_DENIED_HREF = "/org/login?reason=access-denied" as const;

/** Operator re-authentication entry (forwards to Neon Auth sign-in). */
export const ORG_SIGN_IN_HREF = "/org/login" as const;

export function getSharedAdminEmail() {
  return process.env.SHARED_ADMIN_EMAIL?.trim().toLowerCase() ?? "";
}

export function isAdminSession(
  session: AdminSession,
  fallbackEmail?: string,
) {
  if (!session?.user && !fallbackEmail) {
    return false;
  }

  const sharedEmail = getSharedAdminEmail();
  const userEmail =
    session?.user?.email?.trim().toLowerCase() ??
    fallbackEmail?.trim().toLowerCase() ??
    "";

  return (
    session?.user?.role === "admin" ||
    (sharedEmail.length > 0 && userEmail === sharedEmail)
  );
}

export function toAdminAuthenticatedSession(
  session: AdminSession,
): AdminAuthenticatedSession | null {
  if (!session?.user?.id || !session.user.email) {
    return null;
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
      role: session.user.role ?? null,
    },
  };
}
