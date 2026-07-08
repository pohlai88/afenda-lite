import "server-only";

import {
  neonAdminCreateUser,
  neonAdminSetUserPassword,
  neonAdminUpdateUser,
} from "@/lib/auth/admin";
import { getClientDefaultPassword } from "@/lib/client-default-password";
import { normalizeEmail } from "@/lib/clients";
import { getNeonAuthUserByEmail } from "@/lib/neon-auth-users";

export async function ensureClientAuthUser(input: {
  email: string;
  fullName: string;
  password?: string;
}) {
  const email = normalizeEmail(input.email);
  const password = input.password ?? getClientDefaultPassword();
  const name = input.fullName.trim();

  const existing = await getNeonAuthUserByEmail(email);

  if (existing?.id) {
    const passwordResult = await neonAdminSetUserPassword({
      userId: existing.id,
      newPassword: password,
    });

    if ("error" in passwordResult) {
      return { error: passwordResult.error };
    }

    const updateResult = await neonAdminUpdateUser({
      userId: existing.id,
      data: { name },
    });

    if ("error" in updateResult) {
      return { error: updateResult.error };
    }

    return { userId: existing.id, created: false as const };
  }

  const createResult = await neonAdminCreateUser({
    email,
    password,
    name,
    role: "user",
  });

  if ("error" in createResult) {
    return { error: createResult.error };
  }

  const userId =
    createResult.user.id ?? (await getNeonAuthUserByEmail(email))?.id ?? null;
  if (!userId) {
    return { error: "Neon Auth user was created but no user id was returned" };
  }

  return { userId, created: true as const };
}
