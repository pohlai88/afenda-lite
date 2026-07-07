import { recordAuditEvent } from "@/lib/audit";
import {
  ensureClientProfileRow,
  getClientInvitationByEmail,
  markClientInvitationAccepted,
} from "@/lib/clients";

export async function bootstrapClientAfterSupabaseAuth(input: {
  userId: string;
  email?: string | null;
  userMetadata?: Record<string, unknown> | null;
}) {
  await ensureClientProfileRow(input.userId);

  const invitationId = input.userMetadata?.invitation_id;
  if (typeof invitationId === "string" && invitationId.length > 0) {
    await markClientInvitationAccepted(invitationId);
    await recordAuditEvent({
      actorId: input.userId,
      eventType: "invite.accepted",
      resourceType: "client_invitation",
      resourceId: invitationId,
      metadata: { channel: "supabase_invite" },
    });
    return;
  }

  const email = input.email?.trim();
  if (!email) {
    return;
  }

  const invitation = await getClientInvitationByEmail(email);
  if (!invitation || invitation.status !== "pending") {
    return;
  }

  await markClientInvitationAccepted(invitation.id);
  await recordAuditEvent({
    actorId: input.userId,
    eventType: "invite.accepted",
    resourceType: "client_invitation",
    resourceId: invitation.id,
    metadata: { channel: "supabase_invite" },
  });
}
