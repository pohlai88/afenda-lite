import { type ApiSession, getApiSession, roleSatisfies } from "@afenda/auth";
import type { NextRequest, NextResponse } from "next/server";

import {
	getClientDeclarationDraft,
	isClientOnboardingComplete,
	saveClientDeclarationDraft,
} from "@/modules/declarations/domain/declaration-draft";
import {
	type DeclarationDraftGetResponse,
	type DeclarationDraftWriteResponse,
	declarationDraftQuerySchema,
	saveClientDeclarationDraftSchema,
} from "@/modules/declarations/schemas/client";
import {
	PERMISSION_DENIED_MESSAGE,
	type ProductPermissionCode,
	sessionHasPermission,
} from "@/modules/identity/domain/session-permission";
import { jsonData, jsonError } from "@/modules/platform/api/json-response";
import { createCorrelationId } from "@/modules/platform/observability/correlation";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import type { APIErrorBody } from "@/modules/platform/schemas/api-error";
import { parseSchema } from "@/modules/platform/schemas/common";

const DRAFT_CACHE_HEADERS = {
	"Cache-Control": "private, no-store",
} as const;

const DRAFT_NOT_FOUND = "Declaration draft was not found.";
const DRAFT_LOAD_INTERNAL =
	"Declaration draft could not be loaded. Try again or contact an admin.";
const DRAFT_SAVE_INTERNAL =
	"Declaration draft could not be saved. Try again or contact an admin.";

type DraftJsonResponse =
	| NextResponse<{ data: DeclarationDraftGetResponse }>
	| NextResponse<{ data: DeclarationDraftWriteResponse }>
	| NextResponse<APIErrorBody>;

async function requireClientDraftSession(
	code: ProductPermissionCode,
): Promise<
	| { ok: true; session: ApiSession }
	| { ok: false; response: NextResponse<APIErrorBody> }
> {
	const session = await getApiSession();
	if (!session) {
		return {
			ok: false,
			response: jsonError("UNAUTHORIZED", "Authentication required."),
		};
	}
	if (!roleSatisfies(session.role, "client")) {
		return {
			ok: false,
			response: jsonError("FORBIDDEN", "Client session required."),
		};
	}
	if (!(await sessionHasPermission(session, code))) {
		return {
			ok: false,
			response: jsonError("FORBIDDEN", PERMISSION_DENIED_MESSAGE[code]),
		};
	}

	const onboarded = await isClientOnboardingComplete({
		orgId: session.orgId,
		userId: session.userId,
	});
	if (!onboarded) {
		return {
			ok: false,
			response: jsonError("FORBIDDEN", "Complete client onboarding first."),
		};
	}

	return { ok: true, session };
}

function draftInternalError(
	message: string,
	correlationId: string,
	session: ApiSession,
	path: string,
): NextResponse<APIErrorBody> {
	logProductEvent({
		level: "error",
		event: "route.internal_error",
		correlationId,
		orgId: session.orgId,
		actorUserId: session.userId,
		path,
		code: "INTERNAL_ERROR",
	});
	return jsonError("INTERNAL_ERROR", message, { correlationId });
}

/**
 * Declarations draft Route Handler compose (docs-V2/api rest · security pipeline).
 */
export async function handleGetClientDeclarationDraft(
	request: NextRequest,
): Promise<DraftJsonResponse> {
	const correlationId = createCorrelationId();
	const gate = await requireClientDraftSession("declarations.read");
	if (!gate.ok) {
		return gate.response;
	}

	const parsed = parseSchema(declarationDraftQuerySchema, {
		assignmentId: request.nextUrl.searchParams.get("assignmentId"),
	});
	if (!parsed.success) {
		return jsonError(
			"VALIDATION_ERROR",
			"assignmentId query parameter must be a UUID.",
			parsed.details,
		);
	}

	let draft: Awaited<ReturnType<typeof getClientDeclarationDraft>>;
	try {
		draft = await getClientDeclarationDraft({
			orgId: gate.session.orgId,
			clientEmail: gate.session.email,
			assignmentId: parsed.data.assignmentId,
		});
	} catch {
		return draftInternalError(
			DRAFT_LOAD_INTERNAL,
			correlationId,
			gate.session,
			"handleGetClientDeclarationDraft",
		);
	}
	if (!draft) {
		return jsonError("NOT_FOUND", DRAFT_NOT_FOUND);
	}

	return jsonData(draft, { headers: DRAFT_CACHE_HEADERS });
}

async function readJsonBody(request: NextRequest): Promise<unknown> {
	try {
		return await request.json();
	} catch {
		return null;
	}
}

export async function handleWriteClientDeclarationDraft(
	request: NextRequest,
): Promise<DraftJsonResponse> {
	const correlationId = createCorrelationId();
	const gate = await requireClientDraftSession("declarations.manage");
	if (!gate.ok) {
		return gate.response;
	}

	const body = await readJsonBody(request);
	if (body === null) {
		return jsonError("BAD_REQUEST", "Request body must be JSON.");
	}

	const parsed = parseSchema(saveClientDeclarationDraftSchema, body);
	if (!parsed.success) {
		return jsonError(
			"VALIDATION_ERROR",
			"Draft payload failed validation.",
			parsed.details,
		);
	}

	let saved: Awaited<ReturnType<typeof saveClientDeclarationDraft>>;
	try {
		saved = await saveClientDeclarationDraft({
			orgId: gate.session.orgId,
			clientEmail: gate.session.email,
			draft: parsed.data,
		});
	} catch {
		return draftInternalError(
			DRAFT_SAVE_INTERNAL,
			correlationId,
			gate.session,
			"handleWriteClientDeclarationDraft",
		);
	}
	if (!saved.ok) {
		if (saved.reason === "locked") {
			return jsonError(
				"CONFLICT",
				"This declaration is already submitted and cannot be edited.",
			);
		}
		return jsonError("NOT_FOUND", DRAFT_NOT_FOUND);
	}

	return jsonData({ savedAt: saved.savedAt }, { headers: DRAFT_CACHE_HEADERS });
}
