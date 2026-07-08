import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/get-session";
import { toClientAuthenticatedSession } from "@/lib/client-session";
import { persistClientDeclarationDraft } from "@/lib/client-declaration-draft";
import { saveClientDeclarationDraftSchema } from "@/lib/schemas/client";
import { parseSchema } from "@/lib/schemas/common";

export async function POST(request: Request) {
  const session = toClientAuthenticatedSession(await getAuthSession());
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseSchema(saveClientDeclarationDraftSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await persistClientDeclarationDraft({
    ...parsed.data,
    userId: session.user.id,
    userEmail: session.user.email,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 400 },
    );
  }

  return NextResponse.json({ success: true, savedAt: result.savedAt });
}
