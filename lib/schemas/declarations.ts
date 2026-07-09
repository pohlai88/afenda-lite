import { z } from "zod";
import { validateEvidenceMetadata } from "@/lib/domain/evidence-policy";
import { slugSchema, uuidSchema } from "@/lib/schemas/common";

export const registerEvidenceSchema = z
  .object({
    surveyId: uuidSchema,
    slug: slugSchema,
    questionId: uuidSchema,
    fileName: z.string().trim().min(1).max(500),
    mimeType: z.string().trim().max(200),
    sizeBytes: z.coerce.number().int().nonnegative(),
  })
  .superRefine((data, ctx) => {
    const policy = validateEvidenceMetadata({
      fileName: data.fileName,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
    });

    if (!policy.ok) {
      ctx.addIssue({
        code: "custom",
        message: policy.reason,
        path: ["mimeType"],
      });
    }
  });
