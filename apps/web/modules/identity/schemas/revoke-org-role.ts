import { z } from "zod";

import { uuidSchema } from "@/modules/platform/schemas/common";

/**
 * Identity — revoke platform role assignment Zod SSOT (API-004 · GUIDE-018 I3.1).
 * Adapter stamps `orgId` from session; never trust a client-supplied org.
 */

export const revokeOrgRoleCommandSchema = z.object({
	assignmentId: uuidSchema,
});

export type RevokeOrgRoleCommand = z.infer<typeof revokeOrgRoleCommandSchema>;

/** Throw-on-invalid helper for domain/unit tests; adapters prefer `parseSchema`. */
export function parseRevokeOrgRoleCommand(raw: unknown): RevokeOrgRoleCommand {
	return revokeOrgRoleCommandSchema.parse(raw);
}
