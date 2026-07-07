import type { User } from "@supabase/supabase-js";

export type PortalSessionUser = {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
};

export function mapSupabaseUser(user: User): PortalSessionUser {
  const metadata = user.user_metadata ?? {};

  return {
    id: user.id,
    email: user.email ?? null,
    name:
      (typeof metadata.full_name === "string" && metadata.full_name) ||
      (typeof metadata.name === "string" && metadata.name) ||
      null,
    role:
      typeof user.app_metadata?.role === "string"
        ? user.app_metadata.role
        : null,
  };
}
