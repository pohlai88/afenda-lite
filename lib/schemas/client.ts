import { z } from "zod";
import { ISO_COUNTRY_CODES } from "@/lib/countries";
import {
  emailSchema,
  passwordSchema,
  surveyAnswersSchema,
  uuidSchema,
} from "@/lib/schemas/common";

const isoCountrySchema = z.enum(ISO_COUNTRY_CODES);

const passportNumberSchema = z
  .string()
  .trim()
  .min(6)
  .max(20)
  .regex(/^[A-Za-z0-9]+$/, "Passport number must be alphanumeric");

export const clientOnboardingSchema = z.object({
  fullLegalName: z.string().trim().min(1).max(500),
  nationality: isoCountrySchema,
  countryOfResidence: isoCountrySchema,
  additionalResidenceCountries: z
    .array(isoCountrySchema)
    .max(5)
    .default([]),
  passportIssuingCountry: isoCountrySchema,
  passportNumber: passportNumberSchema,
  phone: z.string().trim().min(1).max(50),
  entityName: z.string().trim().min(1).max(500),
  jurisdiction: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(5000),
  identityConsent: z.literal("true"),
});

export const submitClientDeclarationSchema = z.object({
  assignmentId: uuidSchema,
  slug: z.string().trim().min(1).max(200),
  answers: surveyAnswersSchema,
});

export const issueClientInviteSchema = z.object({
  email: emailSchema,
  fullName: z.string().trim().min(1).max(500),
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
