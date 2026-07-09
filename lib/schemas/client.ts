import { z } from "zod";
import { CLIENT_ONBOARDING, CLIENT_INVITE } from "@/lib/form-constraints";
import { ISO_COUNTRY_CODES } from "@/lib/countries";
import {
  emailSchema,
  slugSchema,
  surveyAnswersSchema,
  uuidSchema,
} from "@/lib/schemas/common";

const isoCountrySchema = z.enum(ISO_COUNTRY_CODES);

const passportNumberSchema = z
  .string()
  .trim()
  .min(
    CLIENT_ONBOARDING.passportNumberMin,
    `Passport number must be at least ${CLIENT_ONBOARDING.passportNumberMin} characters.`,
  )
  .max(
    CLIENT_ONBOARDING.passportNumberMax,
    `Passport number must be ${CLIENT_ONBOARDING.passportNumberMax} characters or fewer.`,
  )
  .regex(
    CLIENT_ONBOARDING.passportNumberPattern,
    "Passport number must contain letters and numbers only.",
  );

export const clientOnboardingSchema = z.object({
  fullLegalName: z
    .string()
    .trim()
    .min(1, "Full legal name is required.")
    .max(
      CLIENT_ONBOARDING.fullLegalNameMax,
      `Full legal name must be ${CLIENT_ONBOARDING.fullLegalNameMax} characters or fewer.`,
    ),
  nationality: isoCountrySchema,
  countryOfResidence: isoCountrySchema,
  additionalResidenceCountries: z
    .array(isoCountrySchema)
    .max(
      CLIENT_ONBOARDING.additionalCountriesMax,
      `Select up to ${CLIENT_ONBOARDING.additionalCountriesMax} additional countries.`,
    )
    .default([]),
  passportIssuingCountry: isoCountrySchema,
  passportNumber: passportNumberSchema,
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required.")
    .max(
      CLIENT_ONBOARDING.phoneMax,
      `Phone number must be ${CLIENT_ONBOARDING.phoneMax} characters or fewer.`,
    ),
  entityName: z
    .string()
    .trim()
    .min(1, "Legal entity name is required.")
    .max(
      CLIENT_ONBOARDING.entityNameMax,
      `Legal entity name must be ${CLIENT_ONBOARDING.entityNameMax} characters or fewer.`,
    ),
  jurisdiction: z
    .string()
    .trim()
    .min(1, "Governing jurisdiction is required.")
    .max(
      CLIENT_ONBOARDING.jurisdictionMax,
      `Governing jurisdiction must be ${CLIENT_ONBOARDING.jurisdictionMax} characters or fewer.`,
    ),
  notes: z
    .string()
    .trim()
    .max(
      CLIENT_ONBOARDING.notesMax,
      `Notes must be ${CLIENT_ONBOARDING.notesMax.toLocaleString()} characters or fewer.`,
    ),
  identityConsent: z.custom<"true">(
    (value) => value === "true",
    "Confirm your identity information before saving.",
  ),
});

export const submitClientDeclarationSchema = z.object({
  assignmentId: uuidSchema,
  slug: slugSchema,
  answers: surveyAnswersSchema,
});

export const saveClientDeclarationDraftSchema = z.object({
  assignmentId: uuidSchema,
  answers: surveyAnswersSchema,
  stepIndex: z.number().int().min(0).max(10_000),
});

export const issueClientInviteSchema = z.object({
  email: emailSchema,
  fullName: z
    .string()
    .trim()
    .min(1)
    .max(CLIENT_INVITE.fullNameMax),
  surveyId: uuidSchema,
  dueDate: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(50).optional(),
  ),
});

export const removeClientRegistrationSchema = z.object({
  invitationId: uuidSchema,
});

export const deleteClientAssignmentSchema = z.object({
  assignmentId: uuidSchema,
});
