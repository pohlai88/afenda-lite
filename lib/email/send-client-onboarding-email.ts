import "server-only";

import {
  ensurePortalOrganization,
  inviteClientOrganizationMember,
} from "@/lib/portal-organization";

export type ClientOnboardingEmailResult =
  | { ok: true; provider: "neon-auth-organization" }
  | { ok: false; error: string; status?: number };

/** Sends a Neon Auth organization invitation for operator client registration. */
export async function sendClientOnboardingEmail(input: {
  toEmail: string;
}): Promise<ClientOnboardingEmailResult> {
  try {
    const organization = await ensurePortalOrganization();
    const delivery = await inviteClientOrganizationMember({
      email: input.toEmail,
      organizationId: organization.id,
    });

    if (!delivery.ok) {
      return delivery;
    }

    return { ok: true, provider: "neon-auth-organization" };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Neon Auth organization invitation failed.",
    };
  }
}
