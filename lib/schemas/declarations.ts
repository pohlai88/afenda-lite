import { z } from "zod";
import { validateEvidenceMetadata } from "@/lib/evidence-policy";
import { uuidSchema } from "@/lib/schemas/common";

export const registerEvidenceSchema = z
  .object({
    surveyId: uuidSchema,
    slug: z.string().trim().max(200),
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
