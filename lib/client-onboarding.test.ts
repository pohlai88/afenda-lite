import { describe, expect, it } from "vitest";
import {
  buildClientOnboardingFormDefaults,
  CLIENT_ONBOARDING_FORM_STEPS,
} from "@/lib/client-onboarding";

describe("buildClientOnboardingFormDefaults", () => {
  it("prefers saved profile over invitation and auth name", () => {
    const defaults = buildClientOnboardingFormDefaults({
      profile: {
        fullLegalName: "Profile Name",
        nationality: "SG",
        countryOfResidence: "SG",
        additionalResidenceCountries: ["MY"],
        passportIssuingCountry: "SG",
        passportNumber: "E1234567A",
        phone: "+65 9000 0000",
        entityName: "Profile Entity",
        jurisdiction: "Singapore",
        notes: "note",
      },
      invitation: { fullName: "Invite Name" },
      authName: "Auth Name",
    });

    expect(defaults.fullLegalName).toBe("Profile Name");
    expect(defaults.nationality).toBe("SG");
    expect(defaults.additionalResidenceCountries).toEqual(["MY"]);
    expect(defaults.entityName).toBe("Profile Entity");
    expect(defaults.notes).toBe("note");
  });

  it("falls back invitation → auth name when profile is empty", () => {
    expect(
      buildClientOnboardingFormDefaults({
        profile: null,
        invitation: { fullName: "Invite Name" },
        authName: "Auth Name",
      }).fullLegalName,
    ).toBe("Invite Name");

    expect(
      buildClientOnboardingFormDefaults({
        profile: null,
        invitation: null,
        authName: "Auth Name",
      }).fullLegalName,
    ).toBe("Auth Name");

    expect(
      buildClientOnboardingFormDefaults({
        profile: null,
        invitation: null,
        authName: null,
      }).fullLegalName,
    ).toBe("");
  });

  it("exposes four wizard steps for the rebuild-retained form", () => {
    expect(CLIENT_ONBOARDING_FORM_STEPS).toBe(4);
  });
});
