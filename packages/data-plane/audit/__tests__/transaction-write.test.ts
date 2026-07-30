import { describe, expect, it } from "vitest";

import { prepareAuditWrite } from "../src/prepare-write";
import {
	buildTransactionalAuditInsert,
	prepareDerivedEntityAuditInsertValues,
	prepareTransactionalAuditInsertValues,
} from "../src/transaction-write";

const VALID_COMMAND = {
	organizationId: "org-1",
	actorUserId: "user-1",
	correlationId: "corr-1",
	module: "sales",
	entity: "sales_order",
	entityId: "order-1",
	action: "UPDATE",
} as const;

describe("@afenda/audit transaction write", () => {
	it("prepares and masks explicit domain changes", () => {
		const result = prepareAuditWrite({
			...VALID_COMMAND,
			changes: [
				{
					field: "client_secret",
					oldValue: { value: "old" },
					newValue: { value: "new" },
				},
			],
			metadata: { authorization: "Bearer secret" },
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.data.changes).toEqual([
			{ field: "client_secret", oldValue: "***", newValue: "***" },
		]);
		expect(result.data.metadata).toEqual({ authorization: "***" });
	});

	it("represents added and removed snapshot fields as JSON null", () => {
		const result = prepareAuditWrite({
			...VALID_COMMAND,
			oldValue: { removed: "before", retained: true },
			newValue: { added: "after", retained: true },
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.data.changes).toEqual([
			{ field: "removed", oldValue: "before", newValue: null },
			{ field: "added", oldValue: null, newValue: "after" },
		]);
	});

	it("prepares masked and V1-serialized values for guarded CTE writers", () => {
		const result = prepareTransactionalAuditInsertValues({
			...VALID_COMMAND,
			changes: [
				{
					field: "authorization",
					oldValue: "Bearer old",
					newValue: "Bearer new",
				},
			],
			newValue: { api_key: "plaintext" },
			eventContext: {
				version: 1,
				outcome: "SUCCEEDED",
				source: "sales.drizzle-store",
				causationId: "command-1",
			},
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(JSON.parse(result.data.changesJson)).toEqual([
			{ field: "authorization", oldValue: "***", newValue: "***" },
		]);
		expect(JSON.parse(result.data.newValueJson ?? "null")).toEqual({
			api_key: "***",
		});
		expect(JSON.parse(result.data.metadataJson)).toEqual({
			_afenda_event_context: {
				version: 1,
				outcome: "SUCCEEDED",
				source: "sales.drizzle-store",
				occurredAt: null,
				causationId: "command-1",
				reasonCode: null,
			},
		});
	});

	it("rejects invalid guarded CTE values before serialization", () => {
		const result = prepareTransactionalAuditInsertValues({
			...VALID_COMMAND,
			organizationId: "",
		});

		expect(result.ok).toBe(false);
	});

	it("prepares guarded values without inventing a database-derived entity ID", () => {
		const { entityId: _entityId, ...command } = VALID_COMMAND;
		const result = prepareDerivedEntityAuditInsertValues({
			...command,
			oldValue: { status: "active", api_key: "old-secret" },
			newValue: { status: "ended", api_key: "new-secret" },
			eventContext: {
				version: 1,
				outcome: "SUCCEEDED",
				source: "human-resources.compensation-lifecycle",
				causationId: "command-2",
			},
		});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}
		expect(result.data).not.toHaveProperty("entityId");
		expect(JSON.parse(result.data.oldValueJson ?? "null")).toEqual({
			status: "active",
			api_key: "***",
		});
		expect(JSON.parse(result.data.newValueJson ?? "null")).toEqual({
			status: "ended",
			api_key: "***",
		});
		expect(JSON.parse(result.data.metadataJson)).toMatchObject({
			_afenda_event_context: {
				version: 1,
				source: "human-resources.compensation-lifecycle",
				causationId: "command-2",
			},
		});
	});

	it("rejects caller-supplied entity IDs for the derived-entity contract", () => {
		const result = prepareDerivedEntityAuditInsertValues(VALID_COMMAND);

		expect(result.ok).toBe(false);
	});

	it("rejects invalid derived-entity values before serialization", () => {
		const { entityId: _entityId, ...command } = VALID_COMMAND;
		const result = prepareDerivedEntityAuditInsertValues({
			...command,
			organizationId: "",
		});

		expect(result.ok).toBe(false);
	});

	it("builds a synchronous parameterized insert for a Neon transaction batch", () => {
		const captured: Array<{
			strings: readonly string[];
			values: readonly unknown[];
		}> = [];
		const sql = (strings: TemplateStringsArray, ...values: unknown[]) => {
			const query = { strings: [...strings], values };
			captured.push(query);
			return query;
		};

		const result = buildTransactionalAuditInsert({
			sql,
			id: "8d38f7d0-a429-4f7c-b5fc-83bbdfffb659",
			input: {
				...VALID_COMMAND,
				changes: [{ field: "status", oldValue: "draft", newValue: "approved" }],
			},
		});

		expect(result.ok).toBe(true);
		expect(captured).toHaveLength(1);
		expect(captured[0]?.strings.join("?")).toContain(
			"INSERT INTO platform_audit_log",
		);
		expect(captured[0]?.strings.join("?")).not.toContain("created_at");
		expect(captured[0]?.values).toContain(
			JSON.stringify([
				{ field: "status", oldValue: "draft", newValue: "approved" },
			]),
		);
		expect(captured[0]?.values).toContain(
			JSON.stringify({
				_afenda_event_context: {
					version: 1,
					outcome: "SUCCEEDED",
					source: "sales",
					occurredAt: null,
					causationId: null,
					reasonCode: null,
				},
			}),
		);
	});

	it("fails closed before constructing SQL", () => {
		let calls = 0;
		const sql = (_strings: TemplateStringsArray, ..._values: unknown[]) => {
			calls += 1;
			return { calls };
		};

		const result = buildTransactionalAuditInsert({
			sql,
			input: { ...VALID_COMMAND, organizationId: "" },
		});

		expect(result.ok).toBe(false);
		expect(calls).toBe(0);
	});
});
