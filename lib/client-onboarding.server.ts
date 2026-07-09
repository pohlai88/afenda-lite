import "server-only";

import { buildClientOnboardingFormDefaults } from "@/lib/client-onboarding";
import { getClientInvitationByEmail, getClientProfile } from "@/lib/domain/clients";
import { clientOnboardingSchema } from "@/lib/schemas/client";
import {
  formBooleanLiteral,
  formString,
  formStringList,
} from "@/lib/server-actions/form-data";

export function parseClientOnboardingFormData(formData: FormData) {
  const result = clientOnboardingSchema.safeParse({
    fullLegalName: formString(formData, "fullLegalName"),
    nationality: formString(formData, "nationality"),
    countryOfResidence: formString(formData, "countryOfResidence"),
    additionalResidenceCountries: formStringList(
      formData,
      "additionalResidenceCountries",
    ),
    passportIssuingCountry: formString(formData, "passportIssuingCountry"),
    passportNumber: formString(formData, "passportNumber"),
    phone: formString(formData, "phone"),
    entityName: formString(formData, "entityName"),
    jurisdiction: formString(formData, "jurisdiction"),
    notes: formString(formData, "notes"),
    identityConsent: formBooleanLiteral(formData, "identityConsent"),
  });

  if (!result.success) {
    return {
      success: false as const,
      error: result.error.issues[0]?.message ?? "Check your entries and try again.",
    };
  }

  return { success: true as const, data: result.data };
}

export async function loadClientOnboardingPageData(user: {
  id: string;
  email: string;
  name: string | null;
}) {
  const profile = await getClientProfile(user.id);
  const invitation = user.email
    ? await getClientInvitationByEmail(user.email)
    : null;

  return {
    email: user.email,
    profile,
    invitation,
    formDefaults: buildClientOnboardingFormDefaults({
      profile,
      invitation: invitation?.status === "expired" ? null : invitation,
      authName: user.name,
    }),
    onboardingComplete: Boolean(profile?.onboardingComplete),
  };
}
