import { describe, expect, it } from "vitest";
import { mapClientProfileRow } from "@/modules/identity/domain/client-profile";

describe("mapClientProfileRow", () => {
  it("maps neon row fields to ClientProfile", () => {
    const profile = mapClientProfileRow({
      user_id: "11111111-1111-4111-8111-111111111111",
      full_legal_name: "Ava Rodriguez",
      nationality: null,
      country_of_residence: "Singapore",
      additional_residence_countries: ["MY"],
      passport_issuing_country: null,
      passport_number: null,
      phone: "+65 1",
      entity_name: "Afenda",
      jurisdiction: null,
      notes: null,
      identity_consent_at: null,
      onboarding_complete: true,
      portal_ack_at: null,
      portal_ack_version: null,
      updated_at: "2026-07-12T00:00:00.000Z",
    });

    expect(profile).toMatchObject({
      userId: "11111111-1111-4111-8111-111111111111",
      fullLegalName: "Ava Rodriguez",
      countryOfResidence: "Singapore",
      additionalResidenceCountries: ["MY"],
      phone: "+65 1",
      entityName: "Afenda",
      onboardingComplete: true,
    });
  });
});
