import type { SurveyAnswers } from "@/modules/declarations/question-models";
import {
  getClientDeclarationDraftQuerySchema,
  saveClientDeclarationDraftSchema,
} from "@/modules/declarations/schemas/client";
import type { ApiErrorCode } from "@/modules/platform/schemas/api-error";

export type DeclarationDraftWriteBody =
  | {
      ok: true;
      assignmentId: string;
      answers: SurveyAnswers;
      stepIndex: number;
    }
  | {
      ok: false;
      status: 400 | 422;
      code: ApiErrorCode;
      message: string;
      details?: unknown;
    };

export type DeclarationDraftQuery =
  | { ok: true; assignmentId: string }
  | {
      ok: false;
      status: 422;
      code: "VALIDATION_ERROR";
      message: string;
      details?: unknown;
    };

/** Zod boundary for draft write body (PUT/PATCH/POST). */
export function parseDeclarationDraftJsonBody(body: unknown): DeclarationDraftWriteBody {
  if (body === null || typeof body !== "object") {
    return {
      ok: false,
      status: 400,
      code: "BAD_REQUEST",
      message: "Invalid request",
    };
  }

  const parsed = saveClientDeclarationDraftSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      status: 422,
      code: "VALIDATION_ERROR",
      message: issue?.message ?? "Invalid input",
      details: parsed.error.flatten(),
    };
  }

  return { ok: true, ...parsed.data };
}

/** Zod boundary for `GET ?assignmentId=` */
export function parseDeclarationDraftQuery(
  searchParams: URLSearchParams,
): DeclarationDraftQuery {
  const parsed = getClientDeclarationDraftQuerySchema.safeParse({
    assignmentId: searchParams.get("assignmentId") ?? undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      status: 422,
      code: "VALIDATION_ERROR",
      message: issue?.message ?? "Invalid input",
      details: parsed.error.flatten(),
    };
  }
  return { ok: true, assignmentId: parsed.data.assignmentId };
}
