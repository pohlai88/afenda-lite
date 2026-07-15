import type { NextRequest } from "next/server";

import {
	handleGetClientDeclarationDraft,
	handleWriteClientDeclarationDraft,
} from "@/modules/declarations/api/client-declaration-draft-route";

/**
 * Client declaration draft XHR — GET load · PUT/PATCH persist · POST keepalive
 * (REST-001 api-now · GUIDE-018 I2.4).
 */
export async function GET(request: NextRequest) {
	return handleGetClientDeclarationDraft(request);
}

export async function PUT(request: NextRequest) {
	return handleWriteClientDeclarationDraft(request);
}

export async function PATCH(request: NextRequest) {
	return handleWriteClientDeclarationDraft(request);
}

export async function POST(request: NextRequest) {
	return handleWriteClientDeclarationDraft(request);
}
