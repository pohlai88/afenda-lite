import { createHash, timingSafeEqual } from "node:crypto";

import type { AuditFactInput } from "./ports";

const AUDIT_INTEGRITY_ALGORITHM = "sha256" as const;
const AUDIT_INTEGRITY_VERSION = 1 as const;
const AUDIT_INTEGRITY_DOMAIN =
	"afenda:human-resources:audit-integrity:v1" as const;
const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;
const GENESIS_DIGEST = "0".repeat(64);

export interface HumanResourcesAuditIntegrityRecord {
	auditId: string;
	fact: Readonly<AuditFactInput>;
}

export interface HumanResourcesAuditIntegritySealEntry {
	auditId: string;
	digest: string;
	previousDigest: string;
}

/**
 * The seal must be retained outside the mutable audit-record store. Verification
 * can only detect changes when its trusted anchor is independently preserved.
 */
export interface HumanResourcesAuditIntegritySeal {
	algorithm: typeof AUDIT_INTEGRITY_ALGORITHM;
	entries: readonly HumanResourcesAuditIntegritySealEntry[];
	entryCount: number;
	organizationId: string;
	rootDigest: string;
	version: typeof AUDIT_INTEGRITY_VERSION;
}

export type HumanResourcesAuditIntegrityFailureReason =
	| "entry_count_mismatch"
	| "audit_id_mismatch"
	| "previous_digest_mismatch"
	| "entry_digest_mismatch"
	| "root_digest_mismatch"
	| "organization_mismatch"
	| "invalid_record";

export type HumanResourcesAuditIntegrityVerification =
	| {
			valid: true;
			verifiedEntryCount: number;
			rootDigest: string;
	  }
	| {
			valid: false;
			reason: HumanResourcesAuditIntegrityFailureReason;
			entryIndex: number | null;
	  };

function serializeJsonPrimitive(value: string | number): string {
	const serialized = JSON.stringify(value);
	if (serialized === undefined) {
		throw new TypeError("Audit integrity values must be JSON serializable");
	}
	return serialized;
}

function canonicalJson(value: unknown, ancestors = new Set<object>()): string {
	if (value === null) {
		return "null";
	}
	if (typeof value === "string") {
		return serializeJsonPrimitive(value);
	}
	if (typeof value === "boolean") {
		return value ? "true" : "false";
	}
	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			throw new TypeError("Audit integrity numbers must be finite");
		}
		return serializeJsonPrimitive(value);
	}
	if (value instanceof Date) {
		if (Number.isNaN(value.getTime())) {
			throw new TypeError("Audit integrity dates must be valid");
		}
		return serializeJsonPrimitive(value.toISOString());
	}
	if (typeof value !== "object") {
		throw new TypeError("Audit integrity values must be JSON serializable");
	}
	if (ancestors.has(value)) {
		throw new TypeError("Audit integrity values must not contain cycles");
	}

	ancestors.add(value);
	try {
		if (Array.isArray(value)) {
			return `[${value.map((item) => canonicalJson(item, ancestors)).join(",")}]`;
		}

		const prototype = Object.getPrototypeOf(value);
		if (prototype !== Object.prototype && prototype !== null) {
			throw new TypeError(
				"Audit integrity values must contain only plain JSON objects",
			);
		}
		const properties = Object.entries(value)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(
				([key, propertyValue]) =>
					`${serializeJsonPrimitive(key)}:${canonicalJson(propertyValue, ancestors)}`,
			);
		return `{${properties.join(",")}}`;
	} finally {
		ancestors.delete(value);
	}
}

function digestRecord(input: {
	record: HumanResourcesAuditIntegrityRecord;
	entryIndex: number;
	previousDigest: string;
}): string {
	const { fact } = input.record;
	return createHash(AUDIT_INTEGRITY_ALGORITHM)
		.update(
			canonicalJson({
				domain: AUDIT_INTEGRITY_DOMAIN,
				entryIndex: input.entryIndex,
				previousDigest: input.previousDigest,
				auditId: input.record.auditId,
				organizationId: fact.organizationId,
				actorUserId: fact.actorUserId,
				correlationId: fact.correlationId,
				entity: fact.entity,
				entityId: fact.entityId,
				action: fact.action,
				changes: fact.changes,
				oldValue: fact.oldValue ?? null,
				newValue: fact.newValue ?? null,
			}),
		)
		.digest("hex");
}

function assertSealableRecords(
	organizationId: string,
	records: readonly HumanResourcesAuditIntegrityRecord[],
): void {
	if (organizationId.trim().length === 0) {
		throw new TypeError("Audit integrity organizationId is required");
	}
	if (records.length === 0) {
		throw new TypeError("Audit integrity requires at least one record");
	}
	const auditIds = new Set<string>();
	for (const record of records) {
		if (record.auditId.trim().length === 0) {
			throw new TypeError("Audit integrity auditId is required");
		}
		if (record.fact.organizationId !== organizationId) {
			throw new TypeError("Audit integrity records must belong to one tenant");
		}
		if (auditIds.has(record.auditId)) {
			throw new TypeError("Audit integrity auditId must be unique");
		}
		auditIds.add(record.auditId);
	}
}

function digestMatches(left: string, right: string): boolean {
	if (!(SHA256_HEX_PATTERN.test(left) && SHA256_HEX_PATTERN.test(right))) {
		return false;
	}
	return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

export function createHumanResourcesAuditIntegritySeal(input: {
	organizationId: string;
	records: readonly HumanResourcesAuditIntegrityRecord[];
}): HumanResourcesAuditIntegritySeal {
	assertSealableRecords(input.organizationId, input.records);
	const entries: HumanResourcesAuditIntegritySealEntry[] = [];
	let previousDigest = GENESIS_DIGEST;
	for (const [entryIndex, record] of input.records.entries()) {
		const digest = digestRecord({ record, entryIndex, previousDigest });
		entries.push({
			auditId: record.auditId,
			previousDigest,
			digest,
		});
		previousDigest = digest;
	}

	return {
		version: AUDIT_INTEGRITY_VERSION,
		algorithm: AUDIT_INTEGRITY_ALGORITHM,
		organizationId: input.organizationId,
		entryCount: entries.length,
		entries,
		rootDigest: previousDigest,
	};
}

function invalidVerification(
	reason: HumanResourcesAuditIntegrityFailureReason,
	entryIndex: number | null,
): HumanResourcesAuditIntegrityVerification {
	return { valid: false, reason, entryIndex };
}

export function verifyHumanResourcesAuditIntegrity(input: {
	records: readonly HumanResourcesAuditIntegrityRecord[];
	seal: HumanResourcesAuditIntegritySeal;
}): HumanResourcesAuditIntegrityVerification {
	if (input.records.length !== input.seal.entryCount) {
		return invalidVerification("entry_count_mismatch", null);
	}
	let previousDigest = GENESIS_DIGEST;
	try {
		for (const [entryIndex, record] of input.records.entries()) {
			if (record.fact.organizationId !== input.seal.organizationId) {
				return invalidVerification("organization_mismatch", entryIndex);
			}
			const sealedEntry = input.seal.entries[entryIndex];
			if (sealedEntry === undefined || sealedEntry.auditId !== record.auditId) {
				return invalidVerification("audit_id_mismatch", entryIndex);
			}
			if (!digestMatches(sealedEntry.previousDigest, previousDigest)) {
				return invalidVerification("previous_digest_mismatch", entryIndex);
			}
			const digest = digestRecord({ record, entryIndex, previousDigest });
			if (!digestMatches(sealedEntry.digest, digest)) {
				return invalidVerification("entry_digest_mismatch", entryIndex);
			}
			previousDigest = digest;
		}
	} catch {
		return invalidVerification("invalid_record", null);
	}

	if (!digestMatches(input.seal.rootDigest, previousDigest)) {
		return invalidVerification("root_digest_mismatch", null);
	}
	return {
		valid: true,
		verifiedEntryCount: input.records.length,
		rootDigest: previousDigest,
	};
}
