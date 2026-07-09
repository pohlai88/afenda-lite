import type { SurveyAnswers } from "@/lib/question-models";
import { parseSchema } from "@/lib/schemas/common";
import { saveClientDeclarationDraftSchema } from "@/lib/schemas/client";

export type DeclarationDraftJsonBody =
  | {
      ok: true;
      assignmentId: string;
      answers: SurveyAnswers;
      stepIndex: number;
    }
  | { ok: false; status: 400; error: string };

/** Zod boundary for `POST /api/client/declaration-draft` JSON body. */
export function parseDeclarationDraftJsonBody(body: unknown): DeclarationDraftJsonBody {
  if (!body || typeof body !== "object") {
    return { ok: false, status: 400, error: "Invalid request" };
  }

  const parsed = parseSchema(saveClientDeclarationDraftSchema, body);
  if (!parsed.success) {
    return { ok: false, status: 400, error: parsed.error };
  }

  return { ok: true, ...parsed.data };
}
