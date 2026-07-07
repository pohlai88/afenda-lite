type ClientSession = {
  user?: {
    id?: string;
    email?: string | null;
    name?: string | null;
  };
} | null | undefined;

export type ClientAuthenticatedSession = {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
};

export const CLIENT_ONBOARDING_HREF = "/client/onboarding" as const;
/** Legacy home router alias — session dispatch only, not the auth form. */
export const CLIENT_HOME_HREF = "/client" as const;
export const OPERATOR_DASHBOARD_HREF = "/dashboard" as const;

export function toClientAuthenticatedSession(
  session: ClientSession,
): ClientAuthenticatedSession | null {
  if (!session?.user?.id || !session.user.email) {
    return null;
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
    },
  };
}

export function toPreviewClientSession(input: {
  id: string;
  email: string;
  name: string;
}): ClientAuthenticatedSession {
  return {
    user: {
      id: input.id,
      email: input.email,
      name: input.name,
    },
  };
}
