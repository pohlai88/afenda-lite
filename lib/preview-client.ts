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
    `SELECT id, email, name
     FROM neon_auth."user"
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [email],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name ?? getPreviewClientName()),
  };
}
