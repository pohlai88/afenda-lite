import { z } from "zod";

import { uuidSchema } from "@/modules/platform/schemas/common";

/**
 * Identity — assign platform role command Zod SSOT (API-004 · GUIDE-018 I3.1).
 * Adapter stamps `orgId` / actor from session; never trust a client-supplied org.
 * Scope v1 is fixed to `organization` (ARCH-023).
 */

export const assignOrgRoleCommandSchema = z.object({
	userId: z.string().trim().min(1).max(128),
	roleId: uuidSchema,
});

export type AssignOrgRoleCommand = z.infer<typeof assignOrgRoleCommandSchema>;

/** Throw-on-invalid helper for domain/unit tests; adapters prefer `parseSchema`. */
export function parseAssignOrgRoleCommand(raw: unknown): AssignOrgRoleCommand {
	return assignOrgRoleCommandSchema.parse(raw);
}
