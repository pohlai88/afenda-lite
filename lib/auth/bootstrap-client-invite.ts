import { recordAuditEvent } from "@/lib/domain/audit";
import type { BootstrapClientAuthInput } from "@/lib/auth/types";
import {
  ensureClientProfileRow,
  getClientInvitationByEmail,
  markClientInvitationAccepted,
} from "@/lib/domain/clients";

export function resolveMetadataInvitationId(
  userMetadata?: Record<string, unknown> | null,
): string | null {
  const invitationId = userMetadata?.invitation_id;
  if (typeof invitationId === "string" && invitationId.length > 0) {
    return invitationId;
  }
  return null;
}

export function resolveBootstrapEmail(
  email?: string | null,
): string | null {
  const trimmed = email?.trim();
  return trimmed ? trimmed : null;
}

async function acceptClientInvitation(input: {
  actorId: string;
  invitationId: string;
}) {
  await markClientInvitationAccepted(input.invitationId);
  await recordAuditEvent({
    actorId: input.actorId,
    eventType: "invite.accepted",
    resourceType: "client_invitation",
    resourceId: input.invitationId,
    metadata: { channel: "neon_auth_invite" },
  });
}

export async function bootstrapClientAfterAuth(
  input: BootstrapClientAuthInput,
) {
  await ensureClientProfileRow(input.userId);

  const metadataInvitationId = resolveMetadataInvitationId(input.userMetadata);
  if (metadataInvitationId) {
    await acceptClientInvitation({
      actorId: input.userId,
      invitationId: metadataInvitationId,
    });
    return;
  }

  const email = resolveBootstrapEmail(input.email);
  if (!email) {
    return;
  }

  const invitation = await getClientInvitationByEmail(email);
  if (!invitation || invitation.status !== "pending") {
    return;
  }

  await acceptClientInvitation({
    actorId: input.userId,
    invitationId: invitation.id,
  });
}
