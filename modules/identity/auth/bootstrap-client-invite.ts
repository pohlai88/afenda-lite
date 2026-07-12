import { recordAuditEvent } from "@/modules/platform/audit";
import type { BootstrapClientAuthInput } from "@/modules/identity/auth/types";
import {
  getClientInvitationBootstrapByEmail,
  getClientInvitationBootstrapById,
  markClientInvitationAccepted,
} from "@/modules/identity/domain/client-invitation-bootstrap";
import { ensureClientProfileRow } from "@/modules/identity/domain/client-profile";
import { resolveActivePortalOrganization } from "@/modules/identity/portal-organization";

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

async function resolveBootstrapOrganizationId(input: {
  metadataInvitationId: string | null;
  email: string | null;
}): Promise<string | null> {
  if (input.metadataInvitationId) {
    const byId = await getClientInvitationBootstrapById(
      input.metadataInvitationId,
    );
    if (byId?.organizationId) {
      return byId.organizationId;
    }
  }

  if (input.email) {
    const byEmail = await getClientInvitationBootstrapByEmail(input.email);
    if (byEmail?.organizationId) {
      return byEmail.organizationId;
    }
  }

  try {
    const org = await resolveActivePortalOrganization();
    return org.id;
  } catch {
    return null;
  }
}

export async function bootstrapClientAfterAuth(
  input: BootstrapClientAuthInput,
) {
  const metadataInvitationId = resolveMetadataInvitationId(input.userMetadata);
  const email = resolveBootstrapEmail(input.email);
  const organizationId = await resolveBootstrapOrganizationId({
    metadataInvitationId,
    email,
  });

  if (organizationId) {
    await ensureClientProfileRow(input.userId, organizationId);
  }

  if (metadataInvitationId) {
    await acceptClientInvitation({
      actorId: input.userId,
      invitationId: metadataInvitationId,
    });
    return;
  }

  if (!email) {
    return;
  }

  const invitation = await getClientInvitationBootstrapByEmail(email);
  if (!invitation || invitation.status !== "pending") {
    return;
  }

  await acceptClientInvitation({
    actorId: input.userId,
    invitationId: invitation.id,
  });
}
