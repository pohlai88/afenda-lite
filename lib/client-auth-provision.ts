import "server-only";

import { auth } from "@/lib/auth/server";
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
    const { error } = await auth.admin.setUserPassword({
      userId: existing.id,
      newPassword: password,
    });

    if (error) {
      return { error: error.message };
    }

    const { error: updateError } = await auth.admin.updateUser({
      userId: existing.id,
      data: { name },
    });

    if (updateError) {
      return { error: updateError.message };
    }

    return { userId: existing.id, created: false as const };
  }

  const { data, error } = await auth.admin.createUser({
    email,
    password,
    name,
    role: "user",
  });

  if (error) {
    return { error: error.message };
  }

  const userId =
    data?.user?.id ?? (await getNeonAuthUserByEmail(email))?.id ?? null;
  if (!userId) {
    return { error: "Neon Auth user was created but no user id was returned" };
  }

  return { userId, created: true as const };
}
