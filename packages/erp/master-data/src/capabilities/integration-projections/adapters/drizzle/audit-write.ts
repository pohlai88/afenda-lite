import type { MasterDataAuditFact } from "../../integration/audit-facts";

export type DrizzleAuditWrite = Readonly<{
	table: "platform_audit";
	fact: MasterDataAuditFact;
}>;

export function prepareDrizzleAuditWrite(
	fact: MasterDataAuditFact,
): DrizzleAuditWrite {
	return {
		table: "platform_audit",
		fact,
	};
}
