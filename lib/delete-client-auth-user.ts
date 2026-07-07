import "server-only";

import { auth } from "@/lib/auth/server";
import { getSharedAdminEmail } from "@/lib/admin";
import { normalizeEmail } from "@/lib/clients";
import { getNeonAuthUserByEmail } from "@/lib/neon-auth-users";

export async function deleteClientAuthUserByEmail(email: string) {
  const normalized = normalizeEmail(email);
  const adminEmail = getSharedAdminEmail();

  if (adminEmail && normalized === adminEmail) {
    return { error: "Cannot remove the shared admin account." };
  }

  const user = await getNeonAuthUserByEmail(normalized);
  if (!user) {
    return { deleted: false as const };
  }

  const { error } = await auth.admin.removeUser({ userId: user.id });
  if (error) {
    return { error: error.message };
  }

  return { deleted: true as const, userId: user.id };
}
