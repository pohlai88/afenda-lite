import "server-only";

import { pool } from "@/modules/platform/db";

/**
 * Auth-bootstrap invitation helpers (Identity).
 * Full invitation CRUD stays in Declarations; these exist so session bootstrap
 * does not import Declarations domain.
 */
export type ClientInvitationBootstrapRecord = {
  id: string;
  email: string;
  status: "pending" | "accepted" | "expired";
  expiresAt: Date;
};

function mapBootstrapInvitation(
  row: Record<string, unknown>,
): ClientInvitationBootstrapRecord {
  return {
    id: String(row.id),
    email: String(row.email),
    status: String(row.status) as ClientInvitationBootstrapRecord["status"],
    expiresAt: new Date(String(row.expires_at)),
  };
}

async function expirePendingIfNeeded(
  invitation: ClientInvitationBootstrapRecord,
): Promise<ClientInvitationBootstrapRecord> {
  return expirePendingClientInvitationIfNeeded(invitation);
}

/**
 * Shared pending→expired transition for Identity bootstrap + Declarations invite reads.
 */
export async function expirePendingClientInvitationIfNeeded<
  T extends {
    id: string;
    status: "pending" | "accepted" | "expired";
    expiresAt: Date;
  },
>(invitation: T): Promise<T> {
  if (
    invitation.status === "pending" &&
    invitation.expiresAt.getTime() < Date.now()
  ) {
    await pool.query(
      `UPDATE client_invitations SET status = 'expired' WHERE id = $1`,
      [invitation.id],
    );
    return { ...invitation, status: "expired" };
  }
  return invitation;
}

export async function markClientInvitationAccepted(id: string): Promise<void> {
  await pool.query(
    `UPDATE client_invitations SET status = 'accepted' WHERE id = $1`,
    [id],
  );
}

export async function getClientInvitationBootstrapByEmail(
  email: string,
): Promise<ClientInvitationBootstrapRecord | null> {
  const result = await pool.query(
    `SELECT id, email, status, expires_at
     FROM client_invitations
     WHERE lower(email) = lower($1)
     ORDER BY created_at DESC
     LIMIT 1`,
    [email],
  );

  if (!result.rows[0]) {
    return null;
  }

  return expirePendingIfNeeded(mapBootstrapInvitation(result.rows[0]));
}
