import "server-only";

import { getClientDefaultPassword } from "@/lib/client-default-password";
import { normalizeEmail } from "@/lib/clients";
import { createAdminClient } from "@/lib/supabase/admin";

export async function ensureClientAuthUser(input: {
  email: string;
  fullName: string;
  password?: string;
}) {
  const admin = createAdminClient();
  const email = normalizeEmail(input.email);
  const password = input.password ?? getClientDefaultPassword();
  const name = input.fullName.trim();

  const { data: existingUsers, error: listError } =
    await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

  if (listError) {
    return { error: listError.message };
  }

  const existing = existingUsers.users.find(
    (user) => user.email?.toLowerCase() === email,
  );

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        name,
      },
    });

    if (error) {
      return { error: error.message };
    }

    return { userId: existing.id, created: false as const };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: name,
      name,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { userId: data.user?.id, created: true as const };
}
