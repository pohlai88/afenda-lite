import { randomUUID } from "node:crypto";
import { database as afendaDatabase } from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";
import type { MutationReceiptStore } from "./idempotency";

function failFromPersistence(error: unknown) {
	return errorProject.result(
		errorIngress.postgres(error, { operation: "persistence.postgres" }),
	);
}

export const drizzleMutationReceiptStore: MutationReceiptStore = {
	async reserve(input) {
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
					INSERT INTO ca_mutation_receipt (
						organization_id, command_id, idempotency_key, fingerprint,
						reservation_token, status
					) VALUES (
						${input.organizationId}, ${input.commandId}, ${input.idempotencyKey},
						${input.fingerprint}, ${randomUUID()}, 'in_progress'
					)
					ON CONFLICT (organization_id, command_id, idempotency_key) DO NOTHING
					RETURNING *
				`,
			]);
			const [inserted] = rows as { fingerprint: string }[];
			if (inserted !== undefined) {
				return errorResult.ok({ status: "reserved" as const });
			}
			const [existingRows] = await afendaDatabase.transaction(
				(sql) => [
					sql`
						SELECT fingerprint, status, result FROM ca_mutation_receipt
						WHERE organization_id = ${input.organizationId}
							AND command_id = ${input.commandId}
							AND idempotency_key = ${input.idempotencyKey}
					`,
				],
				{ readOnly: true },
			);
			const [existing] = existingRows as {
				fingerprint: string;
				status: string;
				result: string | null;
			}[];
			if (existing === undefined) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			if (existing.fingerprint !== input.fingerprint) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Idempotency key reused with different input",
				});
			}
			if (existing.status === "completed") {
				return errorResult.ok({
					status: "replay" as const,
					result: existing.result === null ? null : JSON.parse(existing.result),
				});
			}
			return errorResult.fail("CONFLICT", {
				publicMessage: "Duplicate request already in progress",
			});
		} catch (error) {
			return failFromPersistence(error);
		}
	},

	async complete(input): Promise<Result<void>> {
		try {
			await afendaDatabase.transaction((sql) => [
				sql`
					UPDATE ca_mutation_receipt
					SET status = 'completed', result = ${JSON.stringify(input.result)},
						completed_at = now(), record_version = record_version + 1,
						updated_at = now()
					WHERE organization_id = ${input.organizationId}
						AND command_id = ${input.commandId}
						AND idempotency_key = ${input.idempotencyKey}
				`,
			]);
			return errorResult.ok(undefined);
		} catch (error) {
			return failFromPersistence(error);
		}
	},
};
