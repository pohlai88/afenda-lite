type ClientSession = {
  user?: {
    id?: string;
    email?: string | null;
    name?: string | null;
  };
} | null | undefined;

export function isClientSession(session: ClientSession) {
  return Boolean(session?.user?.id && session.user.email);
}

export function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}
