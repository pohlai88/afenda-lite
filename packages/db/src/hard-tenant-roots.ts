/**
 * ARCH-023 hard tenant roots after migration `027`.
 * Every table has `organization_id … NOT NULL` — CI: `pnpm audit:tenancy-nulls`.
 */
import {
	clientAssignments,
	clientInvitations,
	clientProfiles,
	surveys,
} from "./schema/declarations";
import {
	fftEvent,
	fftRole,
	fftRoleAssignment,
	fftSalesMember,
} from "./schema/fft";

/** SQL table names for null-org audits (RB-001 §3.4 · ARCH-023). */
export const HARD_TENANT_ROOT_TABLE_NAMES = [
	"surveys",
	"client_invitations",
	"client_profiles",
	"client_assignments",
	"fft_event",
	"fft_sales_member",
	"fft_role",
	"fft_role_assignment",
] as const;

export type HardTenantRootTableName =
	(typeof HARD_TENANT_ROOT_TABLE_NAMES)[number];

/** Drizzle table refs for schema contract tests. */
export const HARD_TENANT_ROOT_TABLES = {
	surveys,
	clientInvitations,
	clientProfiles,
	clientAssignments,
	fftEvent,
	fftSalesMember,
	fftRole,
	fftRoleAssignment,
} as const;
