import { pool } from "@/lib/db";

type PreviewSession = {
  user?: {
    email?: string | null;
  };
} | null | undefined;

export function getPreviewClientEmail() {
  return process.env.PREVIEW_CLIENT_EMAIL?.trim().toLowerCase() ?? "";
}

export function getPreviewClientPassword() {
  return process.env.PREVIEW_CLIENT_PASSWORD ?? "";
}

export function isPreviewClientConfigured() {
  return (
    getPreviewClientEmail().length > 0 && getPreviewClientPassword().length > 0
  );
}

export function isPreviewClientSession(session: PreviewSession) {
  const previewEmail = getPreviewClientEmail();
  if (!previewEmail || !session?.user?.email) {
    return false;
  }

  return session.user.email.trim().toLowerCase() === previewEmail;
}

export function getPreviewClientName() {
  return process.env.PREVIEW_CLIENT_NAME?.trim() || "Preview Client";
}

export async function getPreviewClientUser() {
  const email = getPreviewClientEmail();
  if (!email) {
    return null;
  }

  const result = await pool.query(
    `SELECT id, email, raw_user_meta_data
     FROM auth.users
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [email],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  const metadata =
    typeof row.raw_user_meta_data === "object" && row.raw_user_meta_data
      ? (row.raw_user_meta_data as Record<string, unknown>)
      : {};

  return {
    id: String(row.id),
    email: String(row.email),
    name:
      (typeof metadata.full_name === "string" && metadata.full_name) ||
      (typeof metadata.name === "string" && metadata.name) ||
      getPreviewClientName(),
  };
}
