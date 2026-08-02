/** Builds the tenant-scoped key used by deterministic in-memory adapters. */
export function idempotencyMapKey(
	organizationId: string,
	idempotencyKey: string,
): string {
	return `${organizationId}:${idempotencyKey}`;
}
