import { runPostClientDeclarationDraft } from "@/lib/api/client-declaration-draft-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return runPostClientDeclarationDraft(request);
}
