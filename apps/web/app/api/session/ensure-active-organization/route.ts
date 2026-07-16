import { handleEnsureActiveOrganizationRequest } from "@afenda/auth";

/**
 * N8 — cookie-safe active organization persistence.
 * Neon `organization.setActive` must run in a Route Handler (not RSC).
 */
export async function GET(request: Request): Promise<Response> {
	return handleEnsureActiveOrganizationRequest(request);
}
