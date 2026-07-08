import "server-only";

import { isAdminSession } from "@/lib/admin";
import { getAuthSession } from "@/lib/auth/get-session";
import { auth } from "@/lib/auth/server";

export type NeonAdminFailure = { error: string };

export type NeonAdminListUsersQuery = {
  searchValue?: string;
  searchField?: "email" | "name";
  searchOperator?: "contains" | "starts_with" | "ends_with";
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  filterField?: string;
  filterValue?: string | number | boolean;
  filterOperator?: "eq" | "ne" | "lt" | "lte" | "gt" | "gte" | "contains";
};

function adminFailure(
  error: { message?: string } | null | undefined,
  fallback: string,
): NeonAdminFailure {
  return { error: error?.message ?? fallback };
}

/** Neon Admin APIs require an authenticated operator session (HTTP-only cookies). */
export async function assertNeonAdminSession(): Promise<NeonAdminFailure | null> {
  const session = await getAuthSession();
  if (!isAdminSession(session)) {
    return { error: "Admin session required." };
  }
  return null;
}

async function runNeonAdmin<T>(
  operation: () => Promise<T | NeonAdminFailure>,
): Promise<T | NeonAdminFailure> {
  const denied = await assertNeonAdminSession();
  if (denied) {
    return denied;
  }
  return operation();
}

export async function neonAdminCreateUser(input: {
  email: string;
  password: string;
  name: string;
  role?: "user" | "admin";
  data?: Record<string, unknown>;
}) {
  return runNeonAdmin(async () => {
    const { data, error } = await auth.admin.createUser({
      email: input.email,
      password: input.password,
      name: input.name,
      role: input.role ?? "user",
      ...(input.data ? { data: input.data } : {}),
    });

    if (error) {
      return adminFailure(error, "Failed to create Neon Auth user.");
    }

    return { user: data.user };
  });
}

export async function neonAdminListUsers(query: NeonAdminListUsersQuery = {}) {
  return runNeonAdmin(async () => {
    const { data, error } = await auth.admin.listUsers({ query });

    if (error) {
      return adminFailure(error, "Failed to list Neon Auth users.");
    }

    const users = data?.users ?? [];
    const total = data?.total ?? 0;

    return {
      users,
      total,
      limit: data && "limit" in data ? data.limit : undefined,
      offset: data && "offset" in data ? data.offset : undefined,
    };
  });
}

export async function neonAdminSetRole(input: {
  userId: string;
  role: "user" | "admin" | ("user" | "admin")[];
}) {
  return runNeonAdmin(async () => {
    const { data, error } = await auth.admin.setRole(input);

    if (error) {
      return adminFailure(error, "Failed to set Neon Auth user role.");
    }

    return { user: data.user };
  });
}

export async function neonAdminSetUserPassword(input: {
  userId: string;
  newPassword: string;
}) {
  return runNeonAdmin(async () => {
    const { error } = await auth.admin.setUserPassword(input);

    if (error) {
      return adminFailure(error, "Failed to set Neon Auth user password.");
    }

    return { ok: true as const };
  });
}

export async function neonAdminUpdateUser(input: {
  userId: string;
  data: Record<string, unknown>;
}) {
  return runNeonAdmin(async () => {
    const { data, error } = await auth.admin.updateUser(input);

    if (error) {
      return adminFailure(error, "Failed to update Neon Auth user.");
    }

    return { user: data };
  });
}

export async function neonAdminBanUser(input: {
  userId: string;
  banReason?: string;
  banExpiresIn?: number;
}) {
  return runNeonAdmin(async () => {
    const { data, error } = await auth.admin.banUser(input);

    if (error) {
      return adminFailure(error, "Failed to ban Neon Auth user.");
    }

    return { user: data.user };
  });
}

export async function neonAdminUnbanUser(userId: string) {
  return runNeonAdmin(async () => {
    const { data, error } = await auth.admin.unbanUser({ userId });

    if (error) {
      return adminFailure(error, "Failed to unban Neon Auth user.");
    }

    return { user: data.user };
  });
}

export async function neonAdminListUserSessions(userId: string) {
  return runNeonAdmin(async () => {
    const { data, error } = await auth.admin.listUserSessions({ userId });

    if (error) {
      return adminFailure(error, "Failed to list Neon Auth user sessions.");
    }

    return { sessions: data.sessions };
  });
}

export async function neonAdminRevokeUserSession(sessionToken: string) {
  return runNeonAdmin(async () => {
    const { error } = await auth.admin.revokeUserSession({ sessionToken });

    if (error) {
      return adminFailure(error, "Failed to revoke Neon Auth session.");
    }

    return { ok: true as const };
  });
}

export async function neonAdminRevokeUserSessions(userId: string) {
  return runNeonAdmin(async () => {
    const { error } = await auth.admin.revokeUserSessions({ userId });

    if (error) {
      return adminFailure(error, "Failed to revoke Neon Auth user sessions.");
    }

    return { ok: true as const };
  });
}

export async function neonAdminImpersonateUser(userId: string) {
  return runNeonAdmin(async () => {
    const { data, error } = await auth.admin.impersonateUser({ userId });

    if (error) {
      return adminFailure(error, "Failed to impersonate Neon Auth user.");
    }

    return { session: data.session, user: data.user };
  });
}

export async function neonAdminStopImpersonating() {
  const { data, error } = await auth.admin.stopImpersonating();

  if (error) {
    return adminFailure(error, "Failed to stop Neon Auth impersonation.");
  }

  return { session: data.session, user: data.user };
}

export async function neonAdminRemoveUser(userId: string) {
  return runNeonAdmin(async () => {
    const { error } = await auth.admin.removeUser({ userId });

    if (error) {
      return adminFailure(error, "Failed to remove Neon Auth user.");
    }

    return { ok: true as const };
  });
}
