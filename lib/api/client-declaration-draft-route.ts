import "server-only";

import { NextResponse } from "next/server";
import { parseDeclarationDraftJsonBody } from "@/lib/api/client-declaration-draft-route.logic";
import { apiError, mapClientSessionGuardToHttp } from "@/lib/api/json-response";
import { POST_CLIENT_DECLARATION_DRAFT_API_ACTION } from "@/lib/api/routes";
import { guardClientSession } from "@/lib/auth/session";
import { persistClientDeclarationDraft } from "@/lib/domain/client-declaration-draft";
import { runLoggedAction } from "@/lib/observability";

/** Shared handler for `POST /api/client/declaration-draft` (keepalive autosave). */
export async function runPostClientDeclarationDraft(request: Request) {
  const guard = await guardClientSession({ requireOnboarding: true });
  if (!guard.allowed) {
    const { status, error } = mapClientSessionGuardToHttp(guard.reason);
    return apiError(status, error);
  }

  return runLoggedAction(
    POST_CLIENT_DECLARATION_DRAFT_API_ACTION,
    guard.session.user.id,
    async () => {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return apiError(400, "Invalid JSON");
      }

      const parsed = parseDeclarationDraftJsonBody(body);
      if (!parsed.ok) {
        return apiError(parsed.status, parsed.error);
      }

      const result = await persistClientDeclarationDraft({
        assignmentId: parsed.assignmentId,
        answers: parsed.answers,
        stepIndex: parsed.stepIndex,
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
