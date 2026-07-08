import "server-only";

import {
  ensurePortalOrganization,
  inviteClientOrganizationMember,
} from "@/lib/portal-organization";

export type ClientOnboardingEmailResult =
  | { ok: true; provider: "neon-auth-organization" }
  | { ok: false; error: string; status?: number };

export async function sendClientOnboardingEmail(input: {
  toEmail: string;
  toName: string;
  text: string;
}): Promise<ClientOnboardingEmailResult> {
  void input.toName;
  void input.text;

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
