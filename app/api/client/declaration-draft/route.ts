import { NextResponse } from "next/server";
import { apiError, mapClientSessionGuardToHttp } from "@/lib/api/json-response";
import { guardClientSession } from "@/lib/auth/session";
import { persistClientDeclarationDraft } from "@/lib/client-declaration-draft";
import { runLoggedAction } from "@/lib/observability";
import type { SurveyAnswers } from "@/lib/questions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POST_CLIENT_DECLARATION_DRAFT_API = "postClientDeclarationDraftApi";

export async function POST(request: Request) {
  const guard = await guardClientSession({ requireOnboarding: true });
  if (!guard.allowed) {
    const { status, error } = mapClientSessionGuardToHttp(guard.reason);
    return apiError(status, error);
  }

  return runLoggedAction(
    POST_CLIENT_DECLARATION_DRAFT_API,
    guard.session.user.id,
    async () => {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return apiError(400, "Invalid JSON");
      }

      if (!body || typeof body !== "object") {
        return apiError(400, "Invalid request");
      }

      const payload = body as Record<string, unknown>;
      const result = await persistClientDeclarationDraft({
        assignmentId: String(payload.assignmentId ?? ""),
        answers:
          payload.answers && typeof payload.answers === "object"
            ? (payload.answers as SurveyAnswers)
            : ({} as SurveyAnswers),
        stepIndex: Number(payload.stepIndex ?? 0),
        userId: guard.session.user.id,
        userEmail: guard.session.user.email,
      });

      if (!result.success) {
        return apiError(result.status ?? 400, result.error);
      }

      return NextResponse.json({ success: true, savedAt: result.savedAt });
    },
  );
}
