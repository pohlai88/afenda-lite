import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const source = readFileSync(
	fileURLToPath(new URL("../src/adapters/drizzle/runs.ts", import.meta.url)),
	"utf8",
);
const resolverSource = readFileSync(
	fileURLToPath(new URL("../src/resolve-store.ts", import.meta.url)),
	"utf8",
);

describe("payroll run production transaction contract", () => {
	it("commits run state, audit evidence, and lifecycle outbox together", () => {
		expect(source).toContain("afendaDatabase.transaction");
		expect(source).toContain("INSERT INTO platform_audit_log");
		expect(source).toContain("INSERT INTO platform_domain_event");
		expect(source).toContain("WITH mutated AS");
	});

	it("serializes finalization with exception creation and rechecks blockers", () => {
		expect(source.match(/FOR UPDATE/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
		expect(source).toContain("severity = 'blocking'");
		expect(source).toContain("status NOT IN ('finalized', 'reversed')");
	});

	it("never selects the memory adapter as an omitted production default", () => {
		expect(resolverSource).toContain("createDrizzlePayrollStore");
		expect(resolverSource).not.toContain("createMemoryPayrollStore");
	});
});
