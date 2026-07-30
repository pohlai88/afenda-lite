import { describe, expect, it } from "vitest";

import { auditEntriesToCsv } from "../src/csv";
import type { AuditEntry } from "../src/types";

const entry: AuditEntry = {
	id: "audit-1",
	organizationId: '=HYPERLINK("https://example.invalid")',
	actorUserId: "+cmd",
	correlationId: "-1+1",
	module: "@SUM(1,1)",
	entity: "member",
	entityId: "member-1",
	action: "EXPORT",
	changes: [],
	oldValue: null,
	newValue: null,
	metadata: null,
	ipAddress: null,
	userAgent: null,
	createdAt: new Date("2026-07-30T00:00:00.000Z"),
};

describe("@afenda/audit CSV export", () => {
	it("neutralizes spreadsheet formulas before CSV escaping", () => {
		const csv = auditEntriesToCsv([entry]);

		expect(csv).toContain("'=HYPERLINK");
		expect(csv).toContain("'+cmd");
		expect(csv).toContain("'-1+1");
		expect(csv).toContain("'@SUM(1,1)");
		expect(csv).not.toContain(",=HYPERLINK");
		expect(csv).not.toContain(",+cmd,");
	});
});
