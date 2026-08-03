import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";

import type {
	AcceptedPayrollHandoff,
	AcceptHandoffRecord,
	PayrollWorkforceIngressStore,
} from "./accepted-handoff.store";

interface StoredAcceptedHandoff extends AcceptedPayrollHandoff {
	acceptedIdempotencyKey: string;
}

export interface WorkforceIngressMemoryState {
	acceptedHandoffs: Map<string, StoredAcceptedHandoff>;
}

function identityKey(input: {
	organizationId: string;
	employeeId: string;
	effectiveDate: string;
	periodStart: string | null;
	periodEnd: string | null;
}): string {
	return [
		input.organizationId,
		input.employeeId,
		input.effectiveDate,
		input.periodStart ?? "-",
		input.periodEnd ?? "-",
	].join("|");
}

export function createMemoryWorkforceIngressMethods(
	state: WorkforceIngressMemoryState,
): PayrollWorkforceIngressStore {
	return {
		acceptWorkforceHandoff(
			record: AcceptHandoffRecord,
		): Promise<Result<AcceptedPayrollHandoff>> {
			const replay = [...state.acceptedHandoffs.values()].find(
				(candidate) =>
					candidate.organizationId === record.organizationId &&
					candidate.acceptedIdempotencyKey === record.idempotencyKey,
			);
			if (replay !== undefined) {
				if (replay.payloadHash !== record.payloadHash) {
					return Promise.resolve(
						errorResult.fail("CONFLICT", {
							publicMessage:
								"Idempotency key replay with a changed payload is rejected",
						}),
					);
				}
				const { acceptedIdempotencyKey: _key, ...surface } = replay;
				return Promise.resolve(errorResult.ok({ ...surface }));
			}

			const key = identityKey(record);
			const active = [...state.acceptedHandoffs.values()].find(
				(candidate) =>
					candidate.status === "accepted" && identityKey(candidate) === key,
			);

			const now = new Date();
			const accepted: StoredAcceptedHandoff = {
				id: randomUUID(),
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				employmentId: record.employmentId,
				contractVersion: record.contractVersion,
				effectiveDate: record.effectiveDate,
				periodStart: record.periodStart,
				periodEnd: record.periodEnd,
				payload: record.payload,
				payloadHash: record.payloadHash,
				status: "accepted",
				supersededByHandoffId: null,
				acceptedAt: now,
				acceptedBy: record.actorUserId,
				version: 1,
				acceptedIdempotencyKey: record.idempotencyKey,
			};

			if (active !== undefined) {
				if (active.payloadHash === record.payloadHash) {
					const { acceptedIdempotencyKey: _key, ...surface } = active;
					return Promise.resolve(errorResult.ok({ ...surface }));
				}
				active.status = "superseded";
				active.supersededByHandoffId = accepted.id;
				active.version += 1;
			}

			state.acceptedHandoffs.set(accepted.id, accepted);
			const { acceptedIdempotencyKey: _key, ...surface } = accepted;
			return Promise.resolve(errorResult.ok({ ...surface }));
		},

		getAcceptedWorkforceHandoff(
			input,
		): Promise<Result<AcceptedPayrollHandoff | null>> {
			const key = identityKey(input);
			const active = [...state.acceptedHandoffs.values()].find(
				(candidate) =>
					candidate.status === "accepted" && identityKey(candidate) === key,
			);
			if (active === undefined) {
				return Promise.resolve(errorResult.ok(null));
			}
			const { acceptedIdempotencyKey: _key, ...surface } = active;
			return Promise.resolve(errorResult.ok({ ...surface }));
		},
	};
}
