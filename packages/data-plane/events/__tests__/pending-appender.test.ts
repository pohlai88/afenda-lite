import type { NeonHttpSql } from "@afenda/db";
import { errorResult } from "@afenda/errors";
import { describe, expect, it, vi } from "vitest";
import {
	createPendingDomainEventAppender,
	type PendingDomainEventWriteInput,
} from "../src/pending-appender";

function pendingEvent(
	overrides: Partial<PendingDomainEventWriteInput> = {},
): PendingDomainEventWriteInput {
	return {
		organizationId: "org_1",
		type: "corporate_administration.test_entity.created.v1",
		sourceModule: "corporate-administration",
		deduplicationKey: "event_1",
		correlationId: "correlation_1",
		causationId: "causation_1",
		actorUserId: "user_1",
		payload: { id: "entity_1" },
		metadata: { aggregateVersion: 1 },
		...overrides,
	};
}

describe("pending domain event appender", () => {
	it("does not open a transaction for an empty append", async () => {
		const executeTransaction = vi.fn();
		const appender = createPendingDomainEventAppender({
			executeTransaction,
		});

		await expect(appender.append([])).resolves.toEqual(
			errorResult.ok(undefined),
		);
		expect(executeTransaction).not.toHaveBeenCalled();
	});

	it("builds one pending insert per envelope in a single transaction", async () => {
		const builtQueries: Array<{
			text: string;
			values: readonly unknown[];
		}> = [];
		const sql = ((
			strings: TemplateStringsArray,
			...values: readonly unknown[]
		) => ({
			text: strings.join("?").replaceAll(/\s+/g, " ").trim(),
			values,
		})) as unknown as NeonHttpSql;
		const executeTransaction = vi.fn(
			(buildQueries: (database: NeonHttpSql) => unknown[]) => {
				builtQueries.push(...(buildQueries(sql) as typeof builtQueries));
				return Promise.resolve();
			},
		);
		const appender = createPendingDomainEventAppender({
			executeTransaction,
		});
		const events = [
			pendingEvent(),
			pendingEvent({
				organizationId: "org_2",
				deduplicationKey: "event_2",
				causationId: undefined,
			}),
		];

		await expect(appender.append(events)).resolves.toEqual(
			errorResult.ok(undefined),
		);

		expect(executeTransaction).toHaveBeenCalledTimes(1);
		expect(builtQueries).toHaveLength(2);
		for (const query of builtQueries) {
			expect(query.text).toContain("INSERT INTO platform_domain_event");
			expect(query.text).toContain("ON CONFLICT");
			expect(query.text).toContain("DO NOTHING");
			expect(query.text).not.toMatch(/publish|dispatch|processed_at/i);
			expect(query.values).toContain("pending");
			expect(query.values).toContain("corporate-administration");
		}
		expect(builtQueries[0]?.values).toContain("org_1");
		expect(builtQueries[0]?.values).toContain("event_1");
		expect(builtQueries[0]?.values).toContain(
			JSON.stringify({ id: "entity_1" }),
		);
		expect(builtQueries[1]?.values).toContain("org_2");
		expect(builtQueries[1]?.values).toContain(null);
	});

	it("keeps unexpected executor failures observable", async () => {
		const unexpected = new TypeError("transaction executor defect");
		const appender = createPendingDomainEventAppender({
			executeTransaction: () => Promise.reject(unexpected),
		});

		await expect(appender.append([pendingEvent()])).rejects.toBe(unexpected);
	});
});
