import "server-only";

import { getSharedAdminEmail } from "@/modules/identity/admin";
import { neonAdminRemoveUser } from "@/modules/identity/auth/admin";
import { normalizeEmail } from "@/modules/platform/normalize-email";
import { getNeonAuthUserByEmail } from "@/modules/identity/domain/neon-auth-users";

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
