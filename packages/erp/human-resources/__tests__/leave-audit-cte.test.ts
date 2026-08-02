import { describe, expect, it } from "vitest";

import { buildAuditCte } from "../src/features/leave/adapters/leave-transactions.drizzle";

const validInput = {
	auditId: "10a96aba-7ceb-4c95-8b3d-2efc7df56731",
	organizationId: "org-1",
	actorUserId: "user-1",
	module: "human-resources",
	entity: "hr_leave_request",
	action: "UPDATE" as const,
	correlationId: "correlation-1",
	changesJson: JSON.stringify([
		{ field: "api_key", oldValue: "old-secret", newValue: "new-secret" },
	]),
	newValueJson: JSON.stringify({ displayName: "O'Brien" }),
	reasonCode: "LEAVE_REQUEST_UPDATE",
	fromCte: "updated_request",
	entityIdReference: "id",
};

describe("generated leave audit CTE", () => {
	it("prepares full kernel-governed evidence and escapes SQL literals", () => {
		const sql = buildAuditCte(validInput);

		expect(sql).toContain("changes, old_value, new_value, metadata");
		expect(sql).toContain("ip_address, user_agent");
		expect(sql).toContain("FROM updated_request");
		expect(sql).toContain("O''Brien");
		expect(sql).toContain('"oldValue":"***"');
		expect(sql).toContain("human-resources.leave");
		expect(sql).not.toContain("old-secret");
		expect(sql).not.toContain("new-secret");
	});

	it("rejects an unsafe mutation-row entity reference", () => {
		expect(() =>
			buildAuditCte({
				...validInput,
				entityIdReference: "id); DROP TABLE platform_audit_log; --",
			}),
		).toThrowError("Invalid generated SQL entity ID reference");
	});

	it("rejects malformed JSON before SQL construction", () => {
		expect(() =>
			buildAuditCte({ ...validInput, changesJson: "not-json" }),
		).toThrowError("Invalid generated audit changes");
	});

	it("rejects a command that fails the audit kernel contract", () => {
		expect(() =>
			buildAuditCte({ ...validInput, organizationId: "" }),
		).toThrowError("Invalid generated leave audit command");
	});
});
