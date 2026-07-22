/** Tenant-scoped idempotency key for in-memory Maps. */
export function idempotencyMapKey(
	organizationId: string,
	idempotencyKey: string,
): string {
	return `${organizationId}:${idempotencyKey}`;
}
