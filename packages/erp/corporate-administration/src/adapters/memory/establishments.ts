// biome-ignore-all lint/suspicious/useAwait: The deterministic memory adapter implements asynchronous establishment ports.
// biome-ignore-all lint/style/useDestructuring: Explicit record access keeps establishment identity visible.
// biome-ignore-all lint/suspicious/noShadow: Domain-local callbacks intentionally mirror establishment records.
import { randomUUID } from "node:crypto";
import { errorResult } from "@afenda/errors";
import {
	matchesEstablishmentAsOf,
	resolveEstablishmentStatusAsOf,
	visibleAtKnownTime,
} from "../../establishments/rules";
import type { EstablishmentStore } from "../../establishments/store";
import type {
	EstablishmentStatusHistory,
	LegalEstablishment,
	Premise,
	RegisteredAddress,
} from "../../establishments/types";
import {
	establishmentStatusHistoryIdSchema,
	legalEstablishmentIdSchema,
	premiseIdSchema,
	registeredAddressIdSchema,
} from "../../kernel/brands";

export function createMemoryCorporateAdministrationEstablishmentStore(): EstablishmentStore {
	const establishments = new Map<string, LegalEstablishment>();
	const statuses = new Map<string, EstablishmentStatusHistory>();
	const addresses = new Map<string, RegisteredAddress>();
	const premises = new Map<string, Premise>();

	return {
		async getLegalEstablishment(input) {
			return errorResult.ok(
				cloneNullable(
					establishments.get(
						key(input.organizationId, input.legalEstablishmentId),
					),
				),
			);
		},
		async listLegalEstablishmentsAsOf(input) {
			const result = [...establishments.values()]
				.filter(
					(row) =>
						row.organizationId === input.organizationId &&
						row.legalCompanyId === input.legalCompanyId &&
						row.registeredFrom <= input.asOf,
				)
				.map((row) => {
					const status = resolveEstablishmentStatusAsOf({
						history: [...statuses.values()].filter(
							(item) =>
								item.organizationId === input.organizationId &&
								item.legalEstablishmentId === row.id,
						),
						asOf: input.asOf,
						knownAt: input.knownAt,
					});
					return status === null
						? null
						: { ...row, currentStatus: status.status };
				})
				.filter((row): row is LegalEstablishment => row !== null)
				.filter(
					(row) =>
						input.status === undefined || row.currentStatus === input.status,
				)
				.sort(
					(left, right) =>
						left.establishmentType.localeCompare(right.establishmentType) ||
						left.jurisdictionCode.localeCompare(right.jurisdictionCode) ||
						left.normalizedRegistrationIdentifier.localeCompare(
							right.normalizedRegistrationIdentifier,
						) ||
						left.id.localeCompare(right.id),
				)
				.map(clone);
			return errorResult.ok(result);
		},
		async listEstablishmentStatusHistory(input) {
			return errorResult.ok(
				[...statuses.values()]
					.filter(
						(row) =>
							row.organizationId === input.organizationId &&
							row.legalEstablishmentId === input.legalEstablishmentId,
					)
					.sort((left, right) =>
						left.effectiveFrom.localeCompare(right.effectiveFrom),
					)
					.map(clone),
			);
		},
		async registerLegalEstablishment(input) {
			const duplicate = [...establishments.values()].some(
				(row) =>
					row.organizationId === input.organizationId &&
					row.jurisdictionCode === input.jurisdictionCode &&
					row.establishmentType === input.establishmentType &&
					row.normalizedRegistrationIdentifier ===
						input.normalizedRegistrationIdentifier,
			);
			if (duplicate) {
				return conflict("registrationIdentifier");
			}
			const id = legalEstablishmentIdSchema.parse(randomUUID());
			const now = new Date(input.recordedAt);
			const row: LegalEstablishment = {
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				establishmentType: input.establishmentType,
				jurisdictionCode: input.jurisdictionCode,
				registrationIdentifier: input.registrationIdentifier,
				normalizedRegistrationIdentifier:
					input.normalizedRegistrationIdentifier,
				displayName: input.displayName,
				currentStatus: "registered",
				registeredFrom: input.registeredFrom,
				createdAt: now,
				createdBy: input.recordedBy,
				updatedAt: now,
				updatedBy: input.recordedBy,
				version: 1,
			};
			const status: EstablishmentStatusHistory = {
				id: establishmentStatusHistoryIdSchema.parse(randomUUID()),
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				legalEstablishmentId: id,
				status: "registered",
				effectiveFrom: input.registeredFrom,
				effectiveTo: null,
				recordedAt: now,
				recordedBy: input.recordedBy,
				reason: null,
				sourceDocumentId: input.sourceDocumentId,
				version: 1,
			};
			establishments.set(key(input.organizationId, id), row);
			statuses.set(key(input.organizationId, status.id), status);
			return errorResult.ok(clone(row));
		},
		async updateLegalEstablishment(input) {
			const current = establishments.get(
				key(input.organizationId, input.legalEstablishmentId),
			);
			if (current === undefined) {
				return notFound();
			}
			if (current.version !== input.expectedVersion) {
				return stale(input.expectedVersion, current.version);
			}
			const updated: LegalEstablishment = {
				...current,
				displayName: input.displayName,
				updatedAt: new Date(input.recordedAt),
				updatedBy: input.recordedBy,
				version: current.version + 1,
			};
			establishments.set(key(input.organizationId, current.id), updated);
			return errorResult.ok(clone(updated));
		},
		async transitionLegalEstablishment(input) {
			const current = establishments.get(
				key(input.organizationId, input.legalEstablishmentId),
			);
			if (current === undefined) {
				return notFound();
			}
			if (current.version !== input.expectedVersion) {
				return stale(input.expectedVersion, current.version);
			}
			const activeStatus = [...statuses.values()].find(
				(row) =>
					row.organizationId === input.organizationId &&
					row.legalEstablishmentId === input.legalEstablishmentId &&
					row.effectiveTo === null,
			);
			if (
				activeStatus === undefined ||
				input.effectiveFrom <= activeStatus.effectiveFrom
			) {
				return conflict("effectiveFrom");
			}
			statuses.set(key(input.organizationId, activeStatus.id), {
				...activeStatus,
				effectiveTo: input.effectiveFrom,
			});
			const nextStatus: EstablishmentStatusHistory = {
				id: establishmentStatusHistoryIdSchema.parse(randomUUID()),
				organizationId: input.organizationId,
				legalCompanyId: current.legalCompanyId,
				legalEstablishmentId: current.id,
				status: input.status,
				effectiveFrom: input.effectiveFrom,
				effectiveTo: null,
				recordedAt: new Date(input.recordedAt),
				recordedBy: input.recordedBy,
				reason: input.reason,
				sourceDocumentId: input.sourceDocumentId,
				version: 1,
			};
			statuses.set(key(input.organizationId, nextStatus.id), nextStatus);
			const updated: LegalEstablishment = {
				...current,
				currentStatus: input.status,
				updatedAt: new Date(input.recordedAt),
				updatedBy: input.recordedBy,
				version: current.version + 1,
			};
			establishments.set(key(input.organizationId, current.id), updated);
			return errorResult.ok(clone(updated));
		},
		async findRegisteredAddressAsOf(input) {
			const row = [...addresses.values()]
				.filter((item) => addressScopeMatches(item, input))
				.filter(
					(item) =>
						matchesEstablishmentAsOf(
							item.effectiveFrom,
							item.effectiveTo,
							input.asOf,
						) && visibleAtKnownTime(item.recordedAt, input.knownAt),
				)
				.sort(
					(left, right) =>
						right.effectiveFrom.localeCompare(left.effectiveFrom) ||
						right.recordedAt.getTime() - left.recordedAt.getTime(),
				)[0];
			return errorResult.ok(row === undefined ? null : clone(row));
		},
		async listRegisteredAddresses(input) {
			return errorResult.ok(
				[...addresses.values()]
					.filter((item) => addressScopeMatches(item, input))
					.map(clone),
			);
		},
		async setRegisteredAddress(input) {
			const id = registeredAddressIdSchema.parse(randomUUID());
			const row: RegisteredAddress = {
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				legalEstablishmentId: input.legalEstablishmentId,
				addressType: input.addressType,
				address: input.address,
				effectiveFrom: input.effectiveFrom,
				effectiveTo: input.effectiveTo,
				recordedAt: new Date(input.recordedAt),
				recordedBy: input.recordedBy,
				sourceDocumentId: input.sourceDocumentId,
				version: 1,
			};
			addresses.set(key(input.organizationId, id), row);
			return errorResult.ok(clone(row));
		},
		async getPremise(input) {
			return errorResult.ok(
				cloneNullable(premises.get(key(input.organizationId, input.premiseId))),
			);
		},
		async listPremisesAsOf(input) {
			return errorResult.ok(
				[...premises.values()]
					.filter(
						(row) =>
							row.organizationId === input.organizationId &&
							row.legalCompanyId === input.legalCompanyId &&
							(input.legalEstablishmentId === undefined ||
								row.legalEstablishmentId === input.legalEstablishmentId) &&
							(input.premiseType === undefined ||
								row.premiseType === input.premiseType) &&
							matchesEstablishmentAsOf(
								row.effectiveFrom,
								row.effectiveTo,
								input.asOf,
							) &&
							visibleAtKnownTime(row.recordedAt, input.knownAt),
					)
					.sort(
						(left, right) =>
							left.premiseType.localeCompare(right.premiseType) ||
							left.displayName.localeCompare(right.displayName) ||
							left.id.localeCompare(right.id),
					)
					.map(clone),
			);
		},
		async registerPremise(input) {
			const id = premiseIdSchema.parse(randomUUID());
			const row: Premise = {
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				legalEstablishmentId: input.legalEstablishmentId,
				premiseType: input.premiseType,
				displayName: input.displayName,
				address: input.address,
				effectiveFrom: input.effectiveFrom,
				effectiveTo: input.effectiveTo,
				recordedAt: new Date(input.recordedAt),
				recordedBy: input.recordedBy,
				sourceDocumentId: input.sourceDocumentId,
				status: "active",
				version: 1,
			};
			premises.set(key(input.organizationId, id), row);
			return errorResult.ok(clone(row));
		},
		async endPremise(input) {
			const current = premises.get(key(input.organizationId, input.premiseId));
			if (current === undefined) {
				return notFound();
			}
			if (current.version !== input.expectedVersion) {
				return stale(input.expectedVersion, current.version);
			}
			const updated: Premise = {
				...current,
				effectiveTo: input.endedOn,
				status: "ended",
				version: current.version + 1,
			};
			premises.set(key(input.organizationId, current.id), updated);
			return errorResult.ok(clone(updated));
		},
	};
}

function addressScopeMatches(
	row: RegisteredAddress,
	input: {
		organizationId: string;
		legalCompanyId: string;
		legalEstablishmentId: string | null;
		addressType: string;
	},
) {
	return (
		row.organizationId === input.organizationId &&
		row.legalCompanyId === input.legalCompanyId &&
		row.legalEstablishmentId === input.legalEstablishmentId &&
		row.addressType === input.addressType
	);
}

function key(organizationId: string, id: string) {
	return `${organizationId}:${id}`;
}

function clone<T>(value: T): T {
	return structuredClone(value);
}

function cloneNullable<T>(value: T | undefined): T | null {
	return value === undefined ? null : clone(value);
}

function conflict(_field: string) {
	return errorResult.fail("CONFLICT", {
		publicMessage:
			"Corporate Administration establishment conflicts with existing history.",
	});
}

function notFound() {
	return errorResult.fail("NOT_FOUND", {
		publicMessage: "Corporate Administration record was not found.",
	});
}

function stale(_expectedVersion: number, _actualVersion: number) {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Corporate Administration record version is stale.",
	});
}
