type AdminSession = {
  user?: {
    id?: string;
    email?: string | null;
    role?: string | null;
  };
} | null | undefined;

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
