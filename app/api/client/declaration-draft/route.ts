import {
  runGetClientDeclarationDraft,
  runWriteClientDeclarationDraft,
} from "@/modules/platform/api/client-declaration-draft-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Client declaration draft autosave (api-now).
 * Contract: GET / PUT / PATCH. POST kept as keepalive alias (same write body).
 */
export async function GET(request: Request) {
  return runGetClientDeclarationDraft(request);
}

export async function PUT(request: Request) {
  return runWriteClientDeclarationDraft(request);
}

export async function PATCH(request: Request) {
  return runWriteClientDeclarationDraft(request);
}

/** Keepalive alias — same contract body as PUT/PATCH. */
export async function POST(request: Request) {
  return runWriteClientDeclarationDraft(request);
}
