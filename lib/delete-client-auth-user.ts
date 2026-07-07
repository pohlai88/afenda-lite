import "server-only";

import { getSharedAdminEmail } from "@/lib/admin";
import { normalizeEmail } from "@/lib/clients";
import { createAdminClient } from "@/lib/supabase/admin";

export async function deleteClientAuthUserByEmail(email: string) {
  const normalized = normalizeEmail(email);
  const adminEmail = getSharedAdminEmail();

  if (adminEmail && normalized === adminEmail) {
    return { error: "Cannot remove the shared admin account." };
  }

  const admin = createAdminClient();
  const { data, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    return { error: listError.message };
  }

  const user = data.users.find(
    (entry) => entry.email?.trim().toLowerCase() === normalized,
  );

  if (!user) {
    return { deleted: false as const };
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return { error: error.message };
  }

  return { deleted: true as const, userId: user.id };
}
