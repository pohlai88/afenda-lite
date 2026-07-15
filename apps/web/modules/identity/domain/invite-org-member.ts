/**
 * Identity — invite command port re-exports Zod SSOT from schemas
 * (API-004 · GUIDE-018 I2.1). Adapter stamps `orgId` from session.
 */

export {
	type InviteOrgMemberCommand,
	inviteOrgMemberCommandSchema,
	parseInviteOrgMemberCommand,
} from "@/modules/identity/schemas/invite-org-member";
