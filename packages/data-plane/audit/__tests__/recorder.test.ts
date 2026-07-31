import { describe, expect, it } from "vitest";

import {
	MAX_AUDIT_JSON_OBJECT_KEYS,
	MAX_AUDIT_JSON_STRING_LENGTH,
} from "../src/json-policy";
import { createAuditRecorder } from "../src/recorder";
import { MAX_AUDIT_IDENTIFIER_LENGTH } from "../src/schemas";
import { assertOk, MemoryAuditStore } from "./helpers/memory-audit-store";

describe("@afenda/audit recorder", () => {
	it("rejects unknown top-level command fields", async () => {
		const store = new MemoryAuditStore();
		const recorder = createAuditRecorder({ store });
		const result = await recorder.record({
			organizationId: "org-1",
			actorUserId: "user-1",
			correlationId: "corr-1",
			module: "identity",
			entity: "member",
			entityId: "m1",
			action: "UPDATE",
			changes: [],
			payload: { password: "must-not-be-silently-discarded" },
		});

		expect(result).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
		expect(store.all()).toHaveLength(0);
	});

	it("rejects unknown fields nested in explicit changes", async () => {
		const store = new MemoryAuditStore();
		const recorder = createAuditRecorder({ store });
		const result = await recorder.record({
			organizationId: "org-1",
			actorUserId: "user-1",
			correlationId: "corr-1",
			module: "identity",
			entity: "member",
			entityId: "m1",
			action: "UPDATE",
			changes: [
				{
					field: "name",
					oldValue: "Before",
					newValue: "After",
					rawPayload: { password: "must-not-be-silently-discarded" },
				},
			],
		});

		expect(result).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
		expect(store.all()).toHaveLength(0);
	});

	it("rejects prototype-mutating JSON keys", async () => {
		const store = new MemoryAuditStore();
		const recorder = createAuditRecorder({ store });
		const metadata: unknown = JSON.parse('{"__proto__":{"polluted":true}}');
		const result = await recorder.record({
			organizationId: "org-1",
			actorUserId: "user-1",
			correlationId: "corr-1",
			module: "identity",
			entity: "member",
			entityId: "m1",
			action: "UPDATE",
			changes: [],
			metadata,
		});

		expect(result).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
		expect(store.all()).toHaveLength(0);
		expect(Object.hasOwn(Object.prototype, "polluted")).toBe(false);
	});
	it("rejects missing organizationId and correlationId", async () => {
		const store = new MemoryAuditStore();
		const recorder = createAuditRecorder({ store });

		const missingOrg = await recorder.record({
			actorUserId: "user-1",
			correlationId: "corr-1",
			module: "identity",
			entity: "role",
			entityId: "r1",
			action: "UPDATE",
		});
		expect(missingOrg.ok).toBe(false);
		if (!missingOrg.ok) {
			expect(missingOrg.code).toBe("VALIDATION_ERROR");
		}

		const missingCorr = await recorder.record({
			organizationId: "org-1",
			actorUserId: "user-1",
			module: "identity",
			entity: "role",
			entityId: "r1",
			action: "UPDATE",
		});
		expect(missingCorr.ok).toBe(false);
		if (!missingCorr.ok) {
			expect(missingCorr.code).toBe("VALIDATION_ERROR");
		}
		expect(store.all()).toHaveLength(0);
	});

	it("keeps synchronous store failures on the promise boundary", async () => {
		const store = new MemoryAuditStore();
		store.write = () => {
			throw new Error("synchronous write failure");
		};
		const recorder = createAuditRecorder({ store });

		const pending = recorder.record({
			organizationId: "org-1",
			actorUserId: "user-1",
			correlationId: "corr-1",
			module: "identity",
			entity: "role",
			entityId: "r1",
			action: "CREATE",
		});

		expect(pending).toBeInstanceOf(Promise);
		await expect(pending).rejects.toThrow("synchronous write failure");
	});

	it("masks sensitive snapshots and writes Change[]", async () => {
		const store = new MemoryAuditStore();
		const recorder = createAuditRecorder({ store });

		const entry = assertOk(
			await recorder.record({
				organizationId: "org-1",
				actorUserId: "user-1",
				correlationId: "corr-1",
				module: "identity",
				entity: "member",
				entityId: "m1",
				action: "UPDATE",
				oldValue: { name: "Ada", password: "old" },
				newValue: { name: "Ada Lovelace", password: "new" },
				metadata: { token: "abc" },
			}),
		);

		expect(entry.oldValue).toEqual({ name: "Ada", password: "***" });
		expect(entry.newValue).toEqual({
			name: "Ada Lovelace",
			password: "***",
		});
		expect(entry.metadata).toEqual({ token: "***" });
		expect(entry.eventContext).toEqual({
			version: 1,
			outcome: "SUCCEEDED",
			source: "identity",
			occurredAt: null,
			causationId: null,
			reasonCode: null,
		});
		expect(entry.changes).toEqual([
			{ field: "name", oldValue: "Ada", newValue: "Ada Lovelace" },
			{ field: "password", oldValue: "***", newValue: "***" },
		]);
	});

	it("normalizes an explicit V1 event context", async () => {
		const store = new MemoryAuditStore();
		const recorder = createAuditRecorder({ store });
		const occurredAt = "2026-07-29T08:15:00.000Z";

		const entry = assertOk(
			await recorder.record({
				organizationId: "org-1",
				actorUserId: "user-1",
				correlationId: "corr-event",
				module: "identity",
				entity: "member",
				entityId: "m-event",
				action: "UPDATE",
				eventContext: {
					version: 1,
					outcome: "DENIED",
					source: "identity-policy",
					occurredAt,
					causationId: "command-1",
					reasonCode: "POLICY_DENIED",
				},
			}),
		);

		expect(entry.eventContext).toEqual({
			version: 1,
			outcome: "DENIED",
			source: "identity-policy",
			occurredAt: new Date(occurredAt),
			causationId: "command-1",
			reasonCode: "POLICY_DENIED",
		});
	});

	it("rejects incompatible versions and the reserved metadata key", async () => {
		const store = new MemoryAuditStore();
		const recorder = createAuditRecorder({ store });
		const base = {
			organizationId: "org-1",
			actorUserId: "user-1",
			correlationId: "corr-event-invalid",
			module: "identity",
			entity: "member",
			entityId: "m-event",
			action: "UPDATE",
		} as const;

		const incompatible = await recorder.record({
			...base,
			eventContext: {
				version: 2,
				outcome: "SUCCEEDED",
				source: "identity",
			},
		});
		const collision = await recorder.record({
			...base,
			metadata: { _afenda_event_context: { version: 1 } },
		});

		expect(incompatible).toMatchObject({
			ok: false,
			code: "VALIDATION_ERROR",
		});
		expect(collision).toMatchObject({ ok: false, code: "BAD_REQUEST" });
		expect(store.all()).toHaveLength(0);
	});

	it("masks secrets on CREATE wildcard changes", async () => {
		const store = new MemoryAuditStore();
		const recorder = createAuditRecorder({ store });

		const entry = assertOk(
			await recorder.record({
				organizationId: "org-1",
				actorUserId: "user-1",
				correlationId: "corr-2",
				module: "identity",
				entity: "member",
				entityId: "m2",
				action: "CREATE",
				newValue: { name: "Ada", password: "plain" },
			}),
		);

		expect(entry.changes).toEqual([
			{
				field: "*",
				oldValue: null,
				newValue: { name: "Ada", password: "***" },
			},
		]);
		expect(entry.newValue).toEqual({ name: "Ada", password: "***" });
	});

	it("normalizes sensitive key names and masks non-string values", async () => {
		const store = new MemoryAuditStore();
		const recorder = createAuditRecorder({ store });

		const entry = assertOk(
			await recorder.record({
				organizationId: "org-1",
				actorUserId: "user-1",
				correlationId: "corr-sensitive",
				module: "identity",
				entity: "member",
				entityId: "m-sensitive",
				action: "CREATE",
				newValue: {
					passwordHash: { encoded: "hash" },
					client_secret: 12_345,
					nested: { AUTHORIZATION: "Bearer credential" },
					items: [{ session_token: ["secret"] }],
				},
			}),
		);

		expect(entry.newValue).toEqual({
			passwordHash: "***",
			client_secret: "***",
			nested: { AUTHORIZATION: "***" },
			items: [{ session_token: "***" }],
		});
	});

	it("rejects cyclic and non-JSON payload values before persistence", async () => {
		const store = new MemoryAuditStore();
		const recorder = createAuditRecorder({ store });
		const cyclic: Record<string, unknown> = {};
		cyclic.self = cyclic;

		const cyclicResult = await recorder.record({
			organizationId: "org-1",
			actorUserId: "user-1",
			correlationId: "corr-cycle",
			module: "identity",
			entity: "member",
			entityId: "m-cycle",
			action: "UPDATE",
			newValue: cyclic,
		});
		const bigintResult = await recorder.record({
			organizationId: "org-1",
			actorUserId: "user-1",
			correlationId: "corr-bigint",
			module: "identity",
			entity: "member",
			entityId: "m-bigint",
			action: "UPDATE",
			metadata: { invalid: 1n },
		});

		expect(cyclicResult.ok).toBe(false);
		expect(bigintResult.ok).toBe(false);
		expect(store.all()).toHaveLength(0);
	});

	it("rejects identifiers beyond the bounded audit contract", async () => {
		const store = new MemoryAuditStore();
		const recorder = createAuditRecorder({ store });

		const result = await recorder.record({
			organizationId: "org-1",
			actorUserId: "user-1",
			correlationId: "corr-bounds",
			module: "m".repeat(MAX_AUDIT_IDENTIFIER_LENGTH + 1),
			entity: "member",
			entityId: "m1",
			action: "CREATE",
		});

		expect(result.ok).toBe(false);
		expect(store.all()).toHaveLength(0);
	});

	it("rejects oversized JSON strings before persistence", async () => {
		const store = new MemoryAuditStore();
		const recorder = createAuditRecorder({ store });

		const result = await recorder.record({
			organizationId: "org-1",
			actorUserId: "user-1",
			correlationId: "corr-payload-bounds",
			module: "identity",
			entity: "member",
			entityId: "m1",
			action: "UPDATE",
			metadata: { value: "x".repeat(MAX_AUDIT_JSON_STRING_LENGTH + 1) },
		});

		expect(result.ok).toBe(false);
		expect(store.all()).toHaveLength(0);
	});

	it("reserves aggregate metadata capacity for the kernel envelope", async () => {
		const store = new MemoryAuditStore();
		const recorder = createAuditRecorder({ store });
		const base = {
			organizationId: "org-1",
			actorUserId: "user-1",
			correlationId: "corr-metadata-capacity",
			module: "identity",
			entity: "member",
			entityId: "m-capacity",
			action: "UPDATE",
		} as const;
		const withinCapacity = Object.fromEntries(
			Array.from({ length: MAX_AUDIT_JSON_OBJECT_KEYS - 1 }, (_, index) => [
				`field_${index}`,
				index,
			]),
		);
		const consumesReservedCapacity = {
			...withinCapacity,
			field_last: true,
		};

		const accepted = await recorder.record({
			...base,
			metadata: withinCapacity,
		});
		const rejected = await recorder.record({
			...base,
			metadata: consumesReservedCapacity,
		});

		expect(accepted.ok).toBe(true);
		expect(rejected).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
		expect(store.all()).toHaveLength(1);
	});
});
