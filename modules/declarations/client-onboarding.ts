export type ClientOnboardingFormDefaults = {
  fullLegalName: string;
  nationality: string | null;
  countryOfResidence: string | null;
  additionalResidenceCountries: string[];
  passportIssuingCountry: string | null;
  passportNumber: string | null;
  phone: string | null;
  entityName: string | null;
  jurisdiction: string | null;
  notes: string | null;
};

/**
 * Wizard sub-steps for the rebuild-retained profile form.
 * UI is tombstoned — constant kept for rebuild slice + copy helpers.
 */
export const CLIENT_ONBOARDING_FORM_STEPS = 4;

/** Prefill order: saved profile → invitation name → auth display name. */
export function buildClientOnboardingFormDefaults(input: {
  profile: {
    fullLegalName?: string | null;
    nationality?: string | null;
    countryOfResidence?: string | null;
    additionalResidenceCountries?: string[];
    passportIssuingCountry?: string | null;
    passportNumber?: string | null;
    phone?: string | null;
    entityName?: string | null;
    jurisdiction?: string | null;
    notes?: string | null;
  } | null;
  invitation: { fullName?: string } | null;
  authName: string | null;
}): ClientOnboardingFormDefaults {
  return {
    fullLegalName:
      input.profile?.fullLegalName ??
      input.invitation?.fullName ??
      input.authName ??
      "",
    nationality: input.profile?.nationality ?? null,
    countryOfResidence: input.profile?.countryOfResidence ?? null,
    additionalResidenceCountries:
      input.profile?.additionalResidenceCountries ?? [],
    passportIssuingCountry: input.profile?.passportIssuingCountry ?? null,
    passportNumber: input.profile?.passportNumber ?? null,
    phone: input.profile?.phone ?? null,
    entityName: input.profile?.entityName ?? null,
    jurisdiction: input.profile?.jurisdiction ?? null,
    notes: input.profile?.notes ?? null,
  };
}
