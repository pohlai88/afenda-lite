import { z } from "zod";
import { SURVEY_EDITOR } from "@/lib/form-constraints";
import type { QuestionType, SurveyQuestion } from "@/lib/question-models";
import {
  cdpQuestionSchema,
  questionConfigSchema,
  type QuestionConfig,
} from "@/lib/schemas/questions";
import { formString, formStringDefault } from "@/lib/server-actions/form-data";
import type { Survey, SurveyMetadata } from "@/lib/domain/surveys";

export { cdpQuestionSchema, questionConfigSchema, type QuestionConfig };

export const CDP_PACKAGE_VERSION = "1.0" as const;

export const cdpMetadataSchema = z.object({
  referenceNumber: z.string().trim().max(SURVEY_EDITOR.referenceMax).optional(),
  caseNumber: z.string().trim().max(SURVEY_EDITOR.referenceMax).optional(),
  effectiveDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  submitBefore: z.string().datetime().optional(),
  surveyor: z
    .object({
      name: z.string().trim().max(SURVEY_EDITOR.partyNameMax).optional(),
      organization: z.string().trim().max(SURVEY_EDITOR.partyNameMax).optional(),
    })
    .optional(),
  surveyee: z
    .object({
      individual: z.string().trim().max(SURVEY_EDITOR.partyNameMax).optional(),
      organization: z.string().trim().max(SURVEY_EDITOR.partyNameMax).optional(),
    })
    .optional(),
  purpose: z.string().trim().max(SURVEY_EDITOR.purposeMax).optional(),
  categories: z
    .array(z.string().trim().min(1).max(SURVEY_EDITOR.categoryMax))
    .max(SURVEY_EDITOR.categoriesMax)
    .optional(),
});

export const cdpAssignmentSchema = z.object({
  clientEmail: z.string().email().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const cdpPackageSchema = z.object({
  cdpVersion: z.literal(CDP_PACKAGE_VERSION),
  kind: z.literal("declaration-package"),
  metadata: cdpMetadataSchema.optional().default({}),
  declaration: z.object({
    title: z.string().trim().min(1).max(SURVEY_EDITOR.titleMax),
    intro: z.string().trim().max(SURVEY_EDITOR.introMax).optional(),
    questions: z.array(cdpQuestionSchema).min(1),
  }),
  assignment: cdpAssignmentSchema.optional(),
});

export type CdpPackage = z.infer<typeof cdpPackageSchema>;

export function metadataToCdp(metadata: SurveyMetadata) {
  return {
    referenceNumber: metadata.referenceNumber ?? undefined,
    caseNumber: metadata.caseNumber ?? undefined,
    effectiveDate: metadata.effectiveDate
      ? metadata.effectiveDate.toISOString().slice(0, 10)
      : undefined,
    submitBefore: metadata.submitBefore?.toISOString(),
    surveyor:
      metadata.surveyorName || metadata.surveyorOrg
        ? {
            name: metadata.surveyorName ?? undefined,
            organization: metadata.surveyorOrg ?? undefined,
          }
        : undefined,
    surveyee:
      metadata.surveyeeIndividual || metadata.surveyeeOrg
        ? {
            individual: metadata.surveyeeIndividual ?? undefined,
            organization: metadata.surveyeeOrg ?? undefined,
          }
        : undefined,
    purpose: metadata.purpose ?? undefined,
    categories:
      metadata.categories.length > 0 ? metadata.categories : undefined,
  };
}

export function cdpToMetadata(
  metadata: z.infer<typeof cdpMetadataSchema>,
): SurveyMetadata {
  return {
    referenceNumber: metadata.referenceNumber ?? null,
    caseNumber: metadata.caseNumber ?? null,
    effectiveDate: metadata.effectiveDate
      ? new Date(`${metadata.effectiveDate}T00:00:00.000Z`)
      : null,
    submitBefore: metadata.submitBefore
      ? new Date(metadata.submitBefore)
      : null,
    surveyorName: metadata.surveyor?.name ?? null,
    surveyorOrg: metadata.surveyor?.organization ?? null,
    surveyeeIndividual: metadata.surveyee?.individual ?? null,
    surveyeeOrg: metadata.surveyee?.organization ?? null,
    purpose: metadata.purpose ?? null,
    categories: metadata.categories ?? [],
  };
}

export function createCdpStarterTemplate(): CdpPackage {
  const today = new Date();
  const effectiveDate = today.toISOString().slice(0, 10);
  const due = new Date(today);
  due.setMonth(due.getMonth() + 1);
  const dueDate = due.toISOString().slice(0, 10);

  return {
    cdpVersion: CDP_PACKAGE_VERSION,
    kind: "declaration-package",
    metadata: {
      referenceNumber: "REF-2026-001",
      caseNumber: "CASE-42",
      effectiveDate,
      submitBefore: `${dueDate}T23:59:59.000Z`,
      surveyor: {
        name: "Jane Reviewer",
        organization: "Acme Compliance Ltd",
      },
      surveyee: {
        individual: "Alex Morgan",
        organization: "Morgan Holdings Pte Ltd",
      },
      purpose: "Annual KYC refresh for corporate declarant.",
      categories: ["KYC", "compliance"],
    },
    declaration: {
      title: "Q2 service declaration",
      intro: "Brief context shown above the questions.",
      questions: [
        {
          prompt: "Do you confirm the information provided is accurate?",
          type: "yes_no",
          required: true,
          config: {
            helpText: "Answer based on records as of the effective date.",
          },
        },
        {
          prompt: "Describe your relationship or business context.",
          type: "text",
          required: true,
          config: {
            placeholder: "Enter your response…",
            minLength: 10,
            maxLength: 2000,
          },
        },
      ],
    },
    assignment: {
      clientEmail: "client@example.com",
      dueDate,
    },
  };
}

function mergeMetadataForExport(
  current: ReturnType<typeof metadataToCdp>,
  starter: NonNullable<CdpPackage["metadata"]>,
): NonNullable<CdpPackage["metadata"]> {
  const hasSurveyor = Boolean(
    current.surveyor?.name?.trim() || current.surveyor?.organization?.trim(),
  );
  const hasSurveyee = Boolean(
    current.surveyee?.individual?.trim() ||
      current.surveyee?.organization?.trim(),
  );

  return {
    referenceNumber: current.referenceNumber?.trim() || starter.referenceNumber,
    caseNumber: current.caseNumber?.trim() || starter.caseNumber,
    effectiveDate: current.effectiveDate || starter.effectiveDate,
    submitBefore: current.submitBefore || starter.submitBefore,
    surveyor: hasSurveyor ? current.surveyor : starter.surveyor,
    surveyee: hasSurveyee ? current.surveyee : starter.surveyee,
    purpose: current.purpose?.trim() || starter.purpose,
    categories:
      current.categories && current.categories.length > 0
        ? current.categories
        : starter.categories,
  };
}

export function buildCdpPackageForExport(input: {
  survey: Survey;
  questions: SurveyQuestion[];
  assignment?: { clientEmail?: string; dueDate?: Date | null };
}): CdpPackage {
  const starter = createCdpStarterTemplate();
  const base = buildCdpPackage(input);

  return {
    ...base,
    metadata: mergeMetadataForExport(
      metadataToCdp(input.survey),
      starter.metadata ?? {},
    ),
    assignment:
      base.assignment ??
      (input.survey.submitBefore
        ? {
            dueDate: input.survey.submitBefore.toISOString().slice(0, 10),
          }
        : starter.assignment),
  };
}

export function buildCdpPackage(input: {
  survey: Survey;
  questions: SurveyQuestion[];
  assignment?: { clientEmail?: string; dueDate?: Date | null };
}): CdpPackage {
  return {
    cdpVersion: CDP_PACKAGE_VERSION,
    kind: "declaration-package",
    metadata: metadataToCdp(input.survey),
    declaration: {
      title: input.survey.title,
      intro: input.survey.question || undefined,
      questions: input.questions.map((q) => ({
        prompt: q.prompt,
        type: q.type,
        required: q.required,
        config: q.config,
      })),
    },
    assignment: input.assignment
      ? {
          clientEmail: input.assignment.clientEmail,
          dueDate: input.assignment.dueDate
            ? input.assignment.dueDate.toISOString().slice(0, 10)
            : undefined,
        }
      : undefined,
  };
}

export function parseCdpPackage(raw: unknown) {
  return cdpPackageSchema.safeParse(raw);
}

export function serializeCdpPackage(pkg: CdpPackage) {
  return JSON.stringify(pkg, null, 2);
}

export function parseCategoriesInput(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function formatCategoriesInput(categories: string[]) {
  return categories.join(", ");
}

export type QuestionDraft = {
  prompt: string;
  type: QuestionType;
  required: boolean;
  config: QuestionConfig;
};

export function cdpQuestionsToDrafts(
  questions: z.infer<typeof cdpQuestionSchema>[],
): QuestionDraft[] {
  return questions.map((q) => ({
    prompt: q.prompt,
    type: q.type,
    required: q.required,
    config: q.config ?? {},
  }));
}

export function parseQuestionConfigsFromForm(formData: FormData) {
  const raw = formStringDefault(formData, "questionConfigs", "[]");
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => questionConfigSchema.parse(item ?? {}));
  } catch {
    return [];
  }
}

export function metadataFromFormData(formData: FormData): SurveyMetadata {
  const submitBeforeRaw = formString(formData, "submitBefore");
  const effectiveDateRaw = formString(formData, "effectiveDate");

  return {
    referenceNumber: formString(formData, "referenceNumber") || null,
    caseNumber: formString(formData, "caseNumber") || null,
    effectiveDate: effectiveDateRaw
      ? new Date(`${effectiveDateRaw}T00:00:00.000Z`)
      : null,
    submitBefore: submitBeforeRaw
      ? new Date(`${submitBeforeRaw}T23:59:59.000Z`)
      : null,
    surveyorName: formString(formData, "surveyorName") || null,
    surveyorOrg: formString(formData, "surveyorOrg") || null,
    surveyeeIndividual: formString(formData, "surveyeeIndividual") || null,
    surveyeeOrg: formString(formData, "surveyeeOrg") || null,
    purpose: formString(formData, "purpose") || null,
    categories: parseCategoriesInput(formString(formData, "categories")),
  };
}
