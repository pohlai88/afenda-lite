import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";

import type { Establishment } from "../../../kernel/contracts/domain";
import { resolveOperation } from "../../../kernel/execution/async";
import type { MemoryCorporateAdministrationState } from "../../../kernel/memory/state";
import type { CorporateAdministrationPage } from "../../../kernel/pagination";
import { validateEstablishmentStatusTransition } from "./establishments.rules";
import type { EstablishmentsStore } from "./establishments.store";

function compareEstablishments(
	left: Establishment,
	right: Establishment,
): number {
	return (
		left.createdAt.getTime() - right.createdAt.getTime() ||
		left.id.localeCompare(right.id)
	);
}

export function createMemoryEstablishmentsMethods(
	state: MemoryCorporateAdministrationState,
): EstablishmentsStore {
	return {
		registerEstablishment(record): Promise<Result<Establishment>> {
			return resolveOperation(() => {
				const existing = state.establishments.find(
					(item) =>
						item.organizationId === record.organizationId &&
						item.jurisdictionCode === record.jurisdictionCode &&
						item.establishmentType === record.establishmentType &&
						item.normalizedRegistrationIdentifier ===
							record.normalizedRegistrationIdentifier,
				);
				if (existing) {
					return errorResult.fail("CONFLICT", {
						publicMessage:
							"Establishment registration identifier already exists",
					});
				}
				const now = new Date();
				const establishment: Establishment = {
					id: randomUUID(),
					organizationId: record.organizationId,
					legalCompanyId: record.legalCompanyId,
					establishmentType: record.establishmentType,
					jurisdictionCode: record.jurisdictionCode,
					registrationIdentifier: record.registrationIdentifier,
					normalizedRegistrationIdentifier:
						record.normalizedRegistrationIdentifier,
					displayName: record.displayName,
					status: "registered",
					registeredFrom: record.registeredFrom,
					version: 1,
					createdBy: record.actorUserId,
					updatedBy: record.actorUserId,
					createdAt: now,
					updatedAt: now,
				};
				state.establishments.push(establishment);
				state.establishmentStatusHistory.push({
					id: randomUUID(),
					organizationId: record.organizationId,
					legalCompanyId: record.legalCompanyId,
					establishmentId: establishment.id,
					status: "registered",
					effectiveFrom: record.registeredFrom,
					effectiveTo: null,
					reason: null,
					recordedAt: now,
					recordedBy: record.actorUserId,
					sourceDocumentId: record.sourceDocumentId,
					version: 1,
					createdAt: now,
				});
				state.auditEntries.push({
					organizationId: record.organizationId,
					actorUserId: record.actorUserId,
					correlationId: record.correlationId,
					module: "corporate-administration",
					entity: "establishment",
					entityId: establishment.id,
					action: "CREATE",
					newValue: establishment,
				});
				state.outboxEvents.push({
					organizationId: record.organizationId,
					type: "corporate_administration.legal_establishment.registered.v1",
					sourceModule: "corporate-administration",
					correlationId: record.correlationId,
					actorUserId: record.actorUserId,
					payload: {
						organizationId: record.organizationId,
						legalCompanyId: record.legalCompanyId,
						occurredAt: now.toISOString(),
						actorUserId: record.actorUserId,
						correlationId: record.correlationId,
						legalEstablishmentId: establishment.id,
						establishmentType: record.establishmentType,
						jurisdictionCode: record.jurisdictionCode,
						registeredFrom: record.registeredFrom,
					},
				});
				return errorResult.ok(establishment);
			});
		},

		updateEstablishment(record): Promise<Result<Establishment>> {
			return resolveOperation(() => {
				const establishment = state.establishments.find(
					(item) =>
						item.organizationId === record.organizationId &&
						item.id === record.id,
				);
				if (!establishment) {
					return errorResult.fail("NOT_FOUND", {
						publicMessage: "Establishment not found",
					});
				}
				if (establishment.version !== record.expectedVersion) {
					return errorResult.fail("CONCURRENCY_CONFLICT");
				}
				establishment.displayName = record.displayName;
				establishment.updatedBy = record.actorUserId;
				establishment.updatedAt = new Date();
				establishment.version += 1;
				state.auditEntries.push({
					organizationId: record.organizationId,
					actorUserId: record.actorUserId,
					correlationId: record.correlationId,
					module: "corporate-administration",
					entity: "establishment",
					entityId: establishment.id,
					action: "UPDATE",
					newValue: establishment,
				});
				state.outboxEvents.push({
					organizationId: record.organizationId,
					type: "corporate_administration.legal_establishment.updated.v1",
					sourceModule: "corporate-administration",
					correlationId: record.correlationId,
					actorUserId: record.actorUserId,
					payload: {
						organizationId: record.organizationId,
						legalCompanyId: establishment.legalCompanyId,
						occurredAt: establishment.updatedAt.toISOString(),
						actorUserId: record.actorUserId,
						correlationId: record.correlationId,
						legalEstablishmentId: establishment.id,
						profileVersion: establishment.version,
					},
				});
				return errorResult.ok(establishment);
			});
		},

		transitionEstablishment(record): Promise<Result<Establishment>> {
			return resolveOperation(() => {
				const establishment = state.establishments.find(
					(item) =>
						item.organizationId === record.organizationId &&
						item.id === record.id,
				);
				if (!establishment) {
					return errorResult.fail("NOT_FOUND", {
						publicMessage: "Establishment not found",
					});
				}
				if (establishment.version !== record.expectedVersion) {
					return errorResult.fail("CONCURRENCY_CONFLICT");
				}
				const transition = validateEstablishmentStatusTransition({
					from: establishment.status,
					to: record.status,
				});
				if (!transition.ok) {
					return transition;
				}
				const now = new Date();
				const [previousVersion] = state.establishmentStatusHistory
					.filter(
						(entry) =>
							entry.establishmentId === establishment.id &&
							entry.effectiveTo === null,
					)
					.sort((left, right) => right.version - left.version);
				if (previousVersion) {
					previousVersion.effectiveTo = record.effectiveFrom;
				}
				establishment.status = record.status;
				establishment.updatedBy = record.actorUserId;
				establishment.updatedAt = now;
				establishment.version += 1;
				state.establishmentStatusHistory.push({
					id: randomUUID(),
					organizationId: record.organizationId,
					legalCompanyId: establishment.legalCompanyId,
					establishmentId: establishment.id,
					status: record.status,
					effectiveFrom: record.effectiveFrom,
					effectiveTo: null,
					reason: record.reason ?? null,
					recordedAt: now,
					recordedBy: record.actorUserId,
					sourceDocumentId: record.sourceDocumentId,
					version: establishment.version,
					createdAt: now,
				});
				state.auditEntries.push({
					organizationId: record.organizationId,
					actorUserId: record.actorUserId,
					correlationId: record.correlationId,
					module: "corporate-administration",
					entity: "establishment",
					entityId: establishment.id,
					action: "UPDATE",
					newValue: establishment,
				});
				state.outboxEvents.push({
					organizationId: record.organizationId,
					type: "corporate_administration.legal_establishment.status_changed.v1",
					sourceModule: "corporate-administration",
					correlationId: record.correlationId,
					actorUserId: record.actorUserId,
					payload: {
						organizationId: record.organizationId,
						legalCompanyId: establishment.legalCompanyId,
						occurredAt: now.toISOString(),
						actorUserId: record.actorUserId,
						correlationId: record.correlationId,
						legalEstablishmentId: establishment.id,
						previousStatus: previousVersion?.status ?? "registered",
						status: record.status,
						effectiveFrom: record.effectiveFrom,
					},
				});
				return errorResult.ok(establishment);
			});
		},

		getEstablishment(input): Promise<Result<Establishment | null>> {
			return resolveOperation(() => {
				const establishment = state.establishments.find(
					(item) =>
						item.organizationId === input.organizationId &&
						item.id === input.id,
				);
				return errorResult.ok(establishment ?? null);
			});
		},

		listEstablishments(
			filter,
		): Promise<Result<CorporateAdministrationPage<Establishment>>> {
			return resolveOperation(() => {
				let filtered = state.establishments
					.filter((item) => item.organizationId === filter.organizationId)
					.sort(compareEstablishments);
				if (filter.legalCompanyId) {
					filtered = filtered.filter(
						(item) => item.legalCompanyId === filter.legalCompanyId,
					);
				}
				if (filter.status) {
					filtered = filtered.filter((item) => item.status === filter.status);
				}
				let startIndex = 0;
				if (filter.cursor) {
					const cursorIndex = filtered.findIndex(
						(item) => item.id === filter.cursor,
					);
					startIndex = cursorIndex === -1 ? 0 : cursorIndex + 1;
				}
				const page = filtered.slice(startIndex, startIndex + filter.limit);
				const nextItem = filtered[startIndex + filter.limit];
				return errorResult.ok({
					items: page,
					nextCursor: nextItem ? page.at(-1)?.id : undefined,
				});
			});
		},

		listEstablishmentStatusHistory(input) {
			return resolveOperation(() => {
				const history = state.establishmentStatusHistory
					.filter((entry) => entry.establishmentId === input.establishmentId)
					.filter((entry) =>
						state.establishments.some(
							(item) =>
								item.id === entry.establishmentId &&
								item.organizationId === input.organizationId,
						),
					);
				return errorResult.ok(Object.freeze(history));
			});
		},
	};
}
