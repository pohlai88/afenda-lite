import { ok } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";

import {
	closeAccountingPeriod,
	createMemoryStore,
	openAccountingPeriod,
	reopenAccountingPeriod,
	softCloseAccountingPeriod,
} from "../src/index";

const organizationId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const actorUserId = "a47ac10b-58cc-4372-a567-0e02b2c3d479";
const authorization = {
	async can() {
		return true;
	},
};
const effects = {
	async emit() {
		return ok(undefined);
	},
};

function makeOptions() {
	return {
		store: createMemoryStore(),
		authorization,
		effects,
	};
}

describe("accounting period lifecycle", () => {
	it("transitions open → soft_closed → closed", async () => {
		const options = makeOptions();

		const period = await openAccountingPeriod(
			{
				organizationId,
				actorUserId,
				correlationId: "open",
				code: "2026-01",
				startDate: "2026-01-01",
				endDate: "2026-01-31",
			},
			options,
		);
		expect(period.ok).toBe(true);
		if (!period.ok) throw new Error("unexpected");
		expect(period.data.status).toBe("open");

		const softClosed = await softCloseAccountingPeriod(
			{
				organizationId,
				actorUserId,
				correlationId: "soft-close",
				periodId: period.data.id,
				expectedVersion: 1,
			},
			options,
		);
		expect(softClosed.ok).toBe(true);
		if (!softClosed.ok) throw new Error("unexpected");
		expect(softClosed.data.status).toBe("soft_closed");
		expect(softClosed.data.softClosed).toBe(true);

		const closed = await closeAccountingPeriod(
			{
				organizationId,
				actorUserId,
				correlationId: "close",
				periodId: period.data.id,
				expectedVersion: 2,
			},
			options,
		);
		expect(closed.ok).toBe(true);
		if (!closed.ok) throw new Error("unexpected");
		expect(closed.data.status).toBe("closed");
	});

	it("rejects close from open (must soft-close first)", async () => {
		const options = makeOptions();

		const period = await openAccountingPeriod(
			{
				organizationId,
				actorUserId,
				correlationId: "open",
				code: "2026-02",
				startDate: "2026-02-01",
				endDate: "2026-02-28",
			},
			options,
		);
		if (!period.ok) throw new Error("unexpected");

		const closed = await closeAccountingPeriod(
			{
				organizationId,
				actorUserId,
				correlationId: "close",
				periodId: period.data.id,
				expectedVersion: 1,
			},
			options,
		);
		expect(closed.ok).toBe(false);
	});

	it("reopens from soft_closed with reason", async () => {
		const options = makeOptions();

		const period = await openAccountingPeriod(
			{
				organizationId,
				actorUserId,
				correlationId: "open",
				code: "2026-03",
				startDate: "2026-03-01",
				endDate: "2026-03-31",
			},
			options,
		);
		if (!period.ok) throw new Error("unexpected");

		await softCloseAccountingPeriod(
			{
				organizationId,
				actorUserId,
				correlationId: "soft-close",
				periodId: period.data.id,
				expectedVersion: 1,
			},
			options,
		);

		const reopened = await reopenAccountingPeriod(
			{
				organizationId,
				actorUserId,
				correlationId: "reopen",
				periodId: period.data.id,
				expectedVersion: 2,
				reason: "Late adjustments needed",
			},
			options,
		);
		expect(reopened.ok).toBe(true);
		if (!reopened.ok) throw new Error("unexpected");
		expect(reopened.data.status).toBe("open");
		expect(reopened.data.reopenReason).toBe("Late adjustments needed");
	});

	it("reopens from closed with reason", async () => {
		const options = makeOptions();

		const period = await openAccountingPeriod(
			{
				organizationId,
				actorUserId,
				correlationId: "open",
				code: "2026-04",
				startDate: "2026-04-01",
				endDate: "2026-04-30",
			},
			options,
		);
		if (!period.ok) throw new Error("unexpected");

		await softCloseAccountingPeriod(
			{
				organizationId,
				actorUserId,
				correlationId: "soft-close",
				periodId: period.data.id,
				expectedVersion: 1,
			},
			options,
		);
		await closeAccountingPeriod(
			{
				organizationId,
				actorUserId,
				correlationId: "close",
				periodId: period.data.id,
				expectedVersion: 2,
			},
			options,
		);

		const reopened = await reopenAccountingPeriod(
			{
				organizationId,
				actorUserId,
				correlationId: "reopen",
				periodId: period.data.id,
				expectedVersion: 3,
				reason: "Error correction required",
			},
			options,
		);
		expect(reopened.ok).toBe(true);
		if (!reopened.ok) throw new Error("unexpected");
		expect(reopened.data.status).toBe("open");
	});

	it("rejects reopen from open", async () => {
		const options = makeOptions();

		const period = await openAccountingPeriod(
			{
				organizationId,
				actorUserId,
				correlationId: "open",
				code: "2026-05",
				startDate: "2026-05-01",
				endDate: "2026-05-31",
			},
			options,
		);
		if (!period.ok) throw new Error("unexpected");

		const reopened = await reopenAccountingPeriod(
			{
				organizationId,
				actorUserId,
				correlationId: "reopen",
				periodId: period.data.id,
				expectedVersion: 1,
				reason: "Should fail",
			},
			options,
		);
		expect(reopened.ok).toBe(false);
	});
});
