/**
 * Deterministic keys for attendance import idempotency.
 * Stored source_reference is namespaced so multiple import sources can coexist
 * under source='import' without colliding on the org unique index.
 */

export function namespacedImportSourceReference(
	sourceKey: string,
	sourceReference: string,
): string {
	return `${sourceKey}:${sourceReference}`;
}

export function importEventIdempotencyKey(
	sourceKey: string,
	sourceReference: string,
): string {
	return `import:${sourceKey}:${sourceReference}`;
}

export function buildImportEventFingerprint(input: {
	employeeId: string;
	employmentId: string | null;
	shiftAssignmentId: string | null;
	eventType: string;
	occurredAtIso: string;
	sourceTimezone: string;
	localWorkDate: string;
	sourceKey: string;
	sourceReference: string;
	payloadChecksum: string | null;
}): string {
	return JSON.stringify({
		employeeId: input.employeeId,
		employmentId: input.employmentId,
		shiftAssignmentId: input.shiftAssignmentId,
		eventType: input.eventType,
		occurredAt: input.occurredAtIso,
		sourceTimezone: input.sourceTimezone,
		localWorkDate: input.localWorkDate,
		source: "import",
		sourceKey: input.sourceKey,
		sourceReference: input.sourceReference,
		payloadChecksum: input.payloadChecksum,
	});
}

export { isValidIanaTimeZone } from "../iana-timezone";
