import { and, caMutationReceipt, eq, type NeonHttpSql, sql } from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";

import { corporateAdministrationErrorDetails } from "../../error-codes";
import type {
	CorporateAdministrationIdempotencyBeginInput,
	CorporateAdministrationIdempotencyBeginOutcome,
	CorporateAdministrationIdempotencyCompletionInput,
	CorporateAdministrationIdempotencyPort,
	CorporateAdministrationIdempotencyReleaseInput,
} from "../../idempotency";
import {
	commandFingerprintSchema,
	idempotencyReservationTokenSchema,
} from "../../kernel/brands";
import {
	canonicalJsonStringify,
	canonicalJsonValueSchema,
} from "../../kernel/canonical-json";
import type { CorporateAdministrationDrizzleDatabase } from "./dependencies";
import {
	staleReservationResult,
	translateCorporateAdministrationInfrastructureError,
} from "./errors";

export type CorporateAdministrationDrizzleIdempotencyDependencies = Readonly<{
	database: CorporateAdministrationDrizzleDatabase;
	createReservationToken: () => string;
	now: () => Date;
}>;

export function createDrizzleCorporateAdministrationIdempotencyPort(
	dependencies: CorporateAdministrationDrizzleIdempotencyDependencies,
): CorporateAdministrationIdempotencyPort {
	return new DrizzleCorporateAdministrationIdempotencyPort(dependencies);
}

export class DrizzleCorporateAdministrationIdempotencyPort
	implements CorporateAdministrationIdempotencyPort
{
	readonly #database: CorporateAdministrationDrizzleDatabase;
	readonly #createReservationToken: () => string;
	readonly #now: () => Date;

	constructor(
		dependencies: CorporateAdministrationDrizzleIdempotencyDependencies,
	) {
		this.#database = dependencies.database;
		this.#createReservationToken = dependencies.createReservationToken;
		this.#now = dependencies.now;
	}

	async begin(
		input: CorporateAdministrationIdempotencyBeginInput,
	): Promise<Result<CorporateAdministrationIdempotencyBeginOutcome>> {
		try {
			const now = this.#now();
			const reservationToken = idempotencyReservationTokenSchema.parse(
				this.#createReservationToken(),
			);
			const inserted = await this.#database
				.insert(caMutationReceipt)
				.values({
					organizationId: input.scope.organizationId,
					commandId: input.scope.commandId,
					idempotencyKey: input.scope.idempotencyKey,
					fingerprint: input.fingerprint,
					reservationToken,
					status: "in_progress",
					reservedAt: now,
					createdAt: now,
					updatedAt: now,
				})
				.onConflictDoNothing()
				.returning();
			if (inserted[0] !== undefined) {
				return ok({ status: "acquired", reservationToken });
			}

			const rows = await this.#database
				.select()
				.from(caMutationReceipt)
				.where(scopePredicate(input.scope))
				.limit(1);
			const row = rows[0];
			if (row === undefined) {
				return fail(
					"SERVICE_UNAVAILABLE",
					"Corporate Administration idempotency state is unavailable.",
					corporateAdministrationErrorDetails(
						"CORPORATE_ADMINISTRATION_EXTERNAL_DEPENDENCY_UNAVAILABLE",
						{ field: "idempotencyKey" },
					),
				);
			}
			if (row.fingerprint !== input.fingerprint) {
				return ok({
					status: "conflict",
					existingFingerprint: commandFingerprintSchema.parse(row.fingerprint),
				});
			}
			if (row.status === "completed") {
				const replay = parseReplayResult(row.result);
				return replay.success
					? ok({ status: "replay", result: replay.data })
					: fail(
							"SERVICE_UNAVAILABLE",
							"Corporate Administration idempotency replay is unavailable.",
							corporateAdministrationErrorDetails(
								"CORPORATE_ADMINISTRATION_EXTERNAL_DEPENDENCY_UNAVAILABLE",
								{ field: "idempotency.result" },
							),
						);
			}
			if (row.status === "released") {
				const updated = await this.#database
					.update(caMutationReceipt)
					.set({
						status: "in_progress",
						reservationToken,
						reservedAt: now,
						updatedAt: now,
						recordVersion: sql`${caMutationReceipt.recordVersion} + 1`,
					})
					.where(
						and(
							scopePredicate(input.scope),
							eq(caMutationReceipt.fingerprint, input.fingerprint),
							eq(caMutationReceipt.status, "released"),
						),
					)
					.returning();
				return updated[0] === undefined
					? ok({ status: "in_progress" })
					: ok({ status: "acquired", reservationToken });
			}
			return ok({ status: "in_progress" });
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async complete(
		input: CorporateAdministrationIdempotencyCompletionInput,
	): Promise<Result<void>> {
		try {
			const now = this.#now();
			const serializedResult = canonicalJsonStringify(input.result);
			if (input.transaction !== undefined) {
				input.transaction.enqueue((database) => {
					const transactionSql = database as NeonHttpSql;
					return transactionSql`
						UPDATE ca_mutation_receipt
						SET status = 'completed',
							result = ${serializedResult},
							completed_at = ${now},
							updated_at = ${now},
							record_version = record_version + 1
						WHERE organization_id = ${input.scope.organizationId}
							AND command_id = ${input.scope.commandId}
							AND idempotency_key = ${input.scope.idempotencyKey}
							AND fingerprint = ${input.fingerprint}
							AND reservation_token = ${input.reservationToken}
							AND status = 'in_progress'
					`;
				});
				return ok(undefined);
			}
			const updated = await this.#database
				.update(caMutationReceipt)
				.set({
					status: "completed",
					result: serializedResult,
					completedAt: now,
					updatedAt: now,
					recordVersion: sql`${caMutationReceipt.recordVersion} + 1`,
				})
				.where(activeReservationPredicate(input))
				.returning();
			return updated[0] === undefined
				? staleReservationResult()
				: ok(undefined);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}

	async release(
		input: CorporateAdministrationIdempotencyReleaseInput,
	): Promise<Result<void>> {
		try {
			const updated = await this.#database
				.update(caMutationReceipt)
				.set({
					status: "released",
					updatedAt: this.#now(),
					recordVersion: sql`${caMutationReceipt.recordVersion} + 1`,
				})
				.where(activeReservationPredicate(input))
				.returning();
			return updated[0] === undefined
				? staleReservationResult()
				: ok(undefined);
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}
}

function scopePredicate(
	scope: CorporateAdministrationIdempotencyBeginInput["scope"],
) {
	return and(
		eq(caMutationReceipt.organizationId, scope.organizationId),
		eq(caMutationReceipt.commandId, scope.commandId),
		eq(caMutationReceipt.idempotencyKey, scope.idempotencyKey),
	);
}

function activeReservationPredicate(
	input:
		| CorporateAdministrationIdempotencyCompletionInput
		| CorporateAdministrationIdempotencyReleaseInput,
) {
	return and(
		scopePredicate(input.scope),
		eq(caMutationReceipt.fingerprint, input.fingerprint),
		eq(caMutationReceipt.reservationToken, input.reservationToken),
		eq(caMutationReceipt.status, "in_progress"),
	);
}

function parseReplayResult(result: string | null) {
	if (result === null) {
		return canonicalJsonValueSchema.safeParse(null);
	}

	try {
		return canonicalJsonValueSchema.safeParse(JSON.parse(result));
	} catch {
		return { success: false } as const;
	}
}
