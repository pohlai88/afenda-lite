import "server-only";

import {
  parseDeclarationDraftJsonBody,
  parseDeclarationDraftQuery,
} from "@/modules/platform/api/client-declaration-draft-route.logic";
import {
  apiData,
  apiError,
  mapClientSessionGuardToHttp,
} from "@/modules/platform/api/json-response";
import {
  GET_CLIENT_DECLARATION_DRAFT_API_ACTION,
  WRITE_CLIENT_DECLARATION_DRAFT_API_ACTION,
} from "@/modules/platform/api/routes";
import { guardClientSession } from "@/modules/identity/auth/session";
import {
  loadClientDeclarationDraft,
  persistClientDeclarationDraft,
} from "@/modules/declarations/domain/client-declaration-draft";
import { apiErrorCodeForStatus } from "@/modules/platform/schemas/api-error";
import { runLoggedAction } from "@/modules/platform/observability";

async function requireClientDraftSession() {
  const guard = await guardClientSession({ requireOnboarding: true });
  if (!guard.allowed) {
    const mapped = mapClientSessionGuardToHttp(guard.reason);
    return {
      ok: false as const,
      response: apiError({
        status: mapped.status,
        code: mapped.code,
        message: mapped.message,
      }),
    };
  }
  return { ok: true as const, session: guard.session };
}

/** `GET /api/client/declaration-draft?assignmentId=` */
export async function runGetClientDeclarationDraft(request: Request) {
  const sessionGate = await requireClientDraftSession();
  if (!sessionGate.ok) return sessionGate.response;

  return runLoggedAction(
    GET_CLIENT_DECLARATION_DRAFT_API_ACTION,
    sessionGate.session.user.id,
    async () => {
      const url = new URL(request.url);
      const parsed = parseDeclarationDraftQuery(url.searchParams);
      if (!parsed.ok) {
        return apiError({
          status: parsed.status,
          code: parsed.code,
          message: parsed.message,
          details: parsed.details,
        });
      }

      const result = await loadClientDeclarationDraft({
        assignmentId: parsed.assignmentId,
        userEmail: sessionGate.session.user.email,
      });

      if (!result.success) {
        const status = result.status ?? 400;
        return apiError({
          status,
          code: apiErrorCodeForStatus(status),
          message: result.error,
        });
      }

      return apiData({
        assignmentId: result.assignmentId,
        answers: result.answers,
        stepIndex: result.stepIndex,
        savedAt: result.savedAt,
      });
    },
  );
}

/**
 * Write draft — used by PUT/PATCH (contract) and POST (keepalive alias).
 * Body: `saveClientDeclarationDraftSchema`.
 */
export async function runWriteClientDeclarationDraft(request: Request) {
  const sessionGate = await requireClientDraftSession();
  if (!sessionGate.ok) return sessionGate.response;

  return runLoggedAction(
    WRITE_CLIENT_DECLARATION_DRAFT_API_ACTION,
    sessionGate.session.user.id,
    async () => {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return apiError({
          status: 400,
          code: "BAD_REQUEST",
          message: "Invalid JSON",
        });
      }

      const parsed = parseDeclarationDraftJsonBody(body);
      if (!parsed.ok) {
        return apiError({
          status: parsed.status,
          code: parsed.code,
          message: parsed.message,
          details: parsed.details,
        });
      }

      const result = await persistClientDeclarationDraft({
        assignmentId: parsed.assignmentId,
        answers: parsed.answers,
        stepIndex: parsed.stepIndex,
        userId: sessionGate.session.user.id,
        userEmail: sessionGate.session.user.email,
      });

      if (!result.success) {
        const status = result.status ?? 400;
        return apiError({
          status,
          code: apiErrorCodeForStatus(status),
          message: result.error,
        });
      }

      return apiData({ savedAt: result.savedAt });
    },
  );
}
