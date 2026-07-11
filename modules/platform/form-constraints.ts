/** Shared validation limits — keep in sync with Zod schemas in `lib/schemas/`. */

export const SURVEY_TEXT_ANSWER_MAX = 10_000;

export const CLIENT_ONBOARDING = {
  fullLegalNameMax: 500,
  passportNumberMin: 6,
  passportNumberMax: 20,
  passportNumberPattern: /^[A-Za-z0-9]+$/,
  additionalCountriesMax: 5,
  phoneMax: 50,
  entityNameMax: 500,
  jurisdictionMax: 200,
  notesMax: 5_000,
} as const;

export const CLIENT_INVITE = {
  fullNameMax: 500,
  emailMax: 320,
  expiresInDays: 14,
} as const;

export const SURVEY_EDITOR = {
  titleMax: 500,
  introMax: 5_000,
  promptMax: 2_000,
  helpTextMax: 2_000,
  placeholderMax: 500,
  textBoundMax: 10_000,
  referenceMax: 100,
  partyNameMax: 500,
  purposeMax: 5_000,
  categoryMax: 100,
  categoriesMax: 20,
} as const;
