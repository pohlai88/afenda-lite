import "server-only";

import { getSharedAdminEmail } from "@/lib/admin";
import { neonAdminRemoveUser } from "@/lib/auth/admin";
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

  const result = await neonAdminRemoveUser(user.id);
  if ("error" in result) {
    return { error: result.error };
  }

  return { deleted: true as const, userId: user.id };
}
