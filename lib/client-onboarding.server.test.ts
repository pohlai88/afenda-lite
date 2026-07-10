import { describe, expect, it } from "vitest";
import { parseClientOnboardingFormData } from "@/lib/client-onboarding.server";

function formFrom(entries: Record<string, string | string[]>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        formData.append(key, item);
      }
    } else {
      formData.set(key, value);
    }
  }
  return formData;
}

const validPayload = {
  fullLegalName: "Ada Lovelace",
  nationality: "SG",
  countryOfResidence: "SG",
  passportIssuingCountry: "SG",
  passportNumber: "E1234567A",
  phone: "+65 9123 4567",
  entityName: "Analytical Engines Pte Ltd",
  jurisdiction: "Singapore",
  notes: "",
  identityConsent: "true",
};

describe("parseClientOnboardingFormData", () => {
  it("accepts a complete onboarding payload", () => {
    const result = parseClientOnboardingFormData(formFrom(validPayload));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fullLegalName).toBe("Ada Lovelace");
      expect(result.data.identityConsent).toBe("true");
    }
  });

  it("rejects missing identity consent", () => {
    const { identityConsent: _omit, ...rest } = validPayload;
    const result = parseClientOnboardingFormData(formFrom(rest));
    expect(result.success).toBe(false);
  });

  it("rejects invalid passport numbers", () => {
    const result = parseClientOnboardingFormData(
      formFrom({ ...validPayload, passportNumber: "!!" }),
    );
    expect(result.success).toBe(false);
  });
});
