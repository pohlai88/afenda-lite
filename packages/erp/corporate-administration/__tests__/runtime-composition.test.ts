import type {
	CorporateAdministrationCommandOptions,
	CorporateAdministrationRuntimePorts,
} from "@afenda/corporate-administration";
import {
	CORPORATE_ADMINISTRATION_EVENT_TYPES,
	createCorporateAdministrationRuntime,
} from "@afenda/corporate-administration";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { createFixedCorporateAdministrationClock } from "./helpers/fixed-clock";
import { createInlineCorporateAdministrationTransactionPort } from "./helpers/inline-transaction";
import { createMemoryCorporateAdministrationAuditFactPort } from "./helpers/memory-audit";
import { createMemoryCorporateAdministrationIdempotencyPort } from "./helpers/memory-idempotency";
import { createMemoryCorporateAdministrationOutboxPort } from "./helpers/memory-outbox";

describe("Corporate Administration runtime composition", () => {
	function ports(): CorporateAdministrationRuntimePorts {
		return {
			clock: createFixedCorporateAdministrationClock(
				"2026-07-26T16:30:00.000Z",
			),
			transaction: createInlineCorporateAdministrationTransactionPort(),
			idempotency: createMemoryCorporateAdministrationIdempotencyPort(),
			audit: createMemoryCorporateAdministrationAuditFactPort(),
			outbox: createMemoryCorporateAdministrationOutboxPort(),
		};
	}

	it("requires every runtime port without installing fallbacks", () => {
		const input = ports();
		const runtime = createCorporateAdministrationRuntime(input);
		expect(runtime.clock).toBe(input.clock);
		expect(runtime.transaction).toBe(input.transaction);
		expect(runtime.idempotency).toBe(input.idempotency);
		expect(runtime.audit).toBe(input.audit);
		expect(runtime.outbox).toBe(input.outbox);
		expect(Object.isFrozen(runtime)).toBe(true);

		for (const incomplete of [
			{},
			{ clock: input.clock },
			{ clock: input.clock, transaction: input.transaction },
			{ clock: input.clock, idempotency: input.idempotency },
			{
				clock: input.clock,
				transaction: input.transaction,
				idempotency: input.idempotency,
			},
			{
				clock: input.clock,
				transaction: input.transaction,
				idempotency: input.idempotency,
				outbox: input.outbox,
			},
		]) {
			expect(() => createCorporateAdministrationRuntime(incomplete)).toThrow();
		}
	});

	it("rejects unsupported nesting, missing methods, and unknown top-level ports", () => {
		const input = ports();
		expect(() =>
			createCorporateAdministrationRuntime({
				...input,
				transaction: { nesting: "savepoint", run: vi.fn() },
			}),
		).toThrow();
		expect(() =>
			createCorporateAdministrationRuntime({
				...input,
				idempotency: { begin: vi.fn(), complete: vi.fn() },
			}),
		).toThrow();
		expect(() =>
			createCorporateAdministrationRuntime({
				...input,
				outbox: {},
			}),
		).toThrow();
		expect(() =>
			createCorporateAdministrationRuntime({
				...input,
				audit: {},
			}),
		).toThrow();
		expect(() =>
			createCorporateAdministrationRuntime({
				...input,
				unapprovedPort: {},
			}),
		).toThrow();
	});

	it("does not invoke ports during composition", () => {
		const clock = {
			now: vi.fn(() => new Date("2026-07-26T00:00:00.000Z")),
			today: vi.fn(() => "2026-07-26" as const),
		};
		const transaction = {
			nesting: "prohibited" as const,
			run: vi.fn(),
		};
		const idempotency = {
			begin: vi.fn(),
			complete: vi.fn(),
			release: vi.fn(),
		};
		const outbox = {
			append: vi.fn(),
		};
		const audit = {
			record: vi.fn(),
		};

		createCorporateAdministrationRuntime({
			clock,
			transaction,
			idempotency,
			audit,
			outbox,
		});

		expect(clock.now).not.toHaveBeenCalled();
		expect(clock.today).not.toHaveBeenCalled();
		expect(transaction.run).not.toHaveBeenCalled();
		expect(idempotency.begin).not.toHaveBeenCalled();
		expect(idempotency.complete).not.toHaveBeenCalled();
		expect(idempotency.release).not.toHaveBeenCalled();
		expect(audit.record).not.toHaveBeenCalled();
		expect(outbox.append).not.toHaveBeenCalled();
	});

	it("is deterministic and contains infrastructure only", () => {
		const input = ports();
		expect(createCorporateAdministrationRuntime(input)).toEqual(
			createCorporateAdministrationRuntime(input),
		);
		expect(
			Object.keys(createCorporateAdministrationRuntime(input)).sort(),
		).toEqual(["audit", "clock", "idempotency", "outbox", "transaction"]);
		expect(CORPORATE_ADMINISTRATION_EVENT_TYPES).toEqual([
			"corporate_administration.legal_company.draft_registered.v1",
			"corporate_administration.legal_company.profile_updated.v1",
			"corporate_administration.legal_company.jurisdiction_profile_set.v1",
			"corporate_administration.legal_company.name_added.v1",
			"corporate_administration.legal_company.name_superseded.v1",
			"corporate_administration.legal_company.legal_form_changed.v1",
			"corporate_administration.legal_company.identifier_registered.v1",
			"corporate_administration.legal_company.financial_year_set.v1",
			"corporate_administration.legal_company.activity_registered.v1",
			"corporate_administration.legal_company.activated.v1",
			"corporate_administration.legal_company.suspended.v1",
			"corporate_administration.legal_company.struck_off_marked.v1",
			"corporate_administration.legal_company.liquidation_entered.v1",
			"corporate_administration.legal_company.dissolved.v1",
			"corporate_administration.legal_company.restored.v1",
			"corporate_administration.legal_company.archived.v1",
			"corporate_administration.legal_establishment.registered.v1",
			"corporate_administration.legal_establishment.updated.v1",
			"corporate_administration.legal_establishment.status_changed.v1",
			"corporate_administration.registered_address.set.v1",
			"corporate_administration.premise.registered.v1",
			"corporate_administration.premise.ended.v1",
			"corporate_administration.governance_body.created.v1",
			"corporate_administration.governance_body.amended.v1",
			"corporate_administration.governance_body.retired.v1",
			"corporate_administration.governance_membership.appointed.v1",
			"corporate_administration.governance_membership.changed.v1",
			"corporate_administration.governance_membership.ended.v1",
			"corporate_administration.statutory_office.defined.v1",
			"corporate_administration.officer.appointed.v1",
			"corporate_administration.officer.appointment_amended.v1",
			"corporate_administration.officer.qualification_recorded.v1",
			"corporate_administration.officer.resigned.v1",
			"corporate_administration.officer.removed.v1",
			"corporate_administration.officer.declaration_recorded.v1",
			"corporate_administration.officer.declaration_superseded.v1",
			"corporate_administration.officer.disqualified.v1",
			"corporate_administration.officer.disqualification_ended.v1",
			"corporate_administration.conflict.disclosed.v1",
			"corporate_administration.conflict.recusal_recorded.v1",
			"corporate_administration.governance_meeting.scheduled.v1",
			"corporate_administration.meeting_notice.issued.v1",
			"corporate_administration.meeting_notice.delivered.v1",
			"corporate_administration.meeting_notice.waived.v1",
			"corporate_administration.meeting_participant.recorded.v1",
			"corporate_administration.governance_meeting.opened.v1",
			"corporate_administration.governance_meeting.quorum_recorded.v1",
			"corporate_administration.governance_meeting.adjourned.v1",
			"corporate_administration.governance_meeting.closed.v1",
			"corporate_administration.meeting_vote.recorded.v1",
			"corporate_administration.resolution.adopted.v1",
			"corporate_administration.resolution.rejected.v1",
			"corporate_administration.resolution.superseded.v1",
			"corporate_administration.resolution.minutes_recorded.v1",
			"corporate_administration.resolution.action_assigned.v1",
			"corporate_administration.resolution.action_completed.v1",
		]);
	});

	it("uses composed runtime model while caller context requires authorization", () => {
		expectTypeOf<CorporateAdministrationCommandOptions>().not.toHaveProperty(
			"clock",
		);
		expectTypeOf<CorporateAdministrationCommandOptions>().not.toHaveProperty(
			"transaction",
		);
		expectTypeOf<CorporateAdministrationCommandOptions>().not.toHaveProperty(
			"idempotency",
		);
		expectTypeOf<CorporateAdministrationCommandOptions>().toHaveProperty(
			"authorization",
		);
		expectTypeOf<CorporateAdministrationCommandOptions>().toHaveProperty(
			"idempotencyKey",
		);
		expectTypeOf<CorporateAdministrationCommandOptions>().toHaveProperty(
			"causationId",
		);
	});

	it("keeps request facts out of composed runtime infrastructure", () => {
		expectTypeOf<CorporateAdministrationRuntimePorts>().not.toHaveProperty(
			"organizationId",
		);
		expectTypeOf<CorporateAdministrationRuntimePorts>().not.toHaveProperty(
			"actorUserId",
		);
		expectTypeOf<CorporateAdministrationRuntimePorts>().not.toHaveProperty(
			"correlationId",
		);
		expectTypeOf<CorporateAdministrationRuntimePorts>().not.toHaveProperty(
			"authorization",
		);
		expectTypeOf<CorporateAdministrationRuntimePorts>().not.toHaveProperty(
			"idempotencyKey",
		);
	});
});
