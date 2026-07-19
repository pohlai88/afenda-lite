/**
 * Platform cache key generators.
 * Shape: `{domain}:{entity}:{orgId?}:{id?}`
 */
export const CacheKeys = {
	orgConfig: (organizationId: string) => `org:config:${organizationId}`,
	orgFeatures: (organizationId: string) => `org:features:${organizationId}`,
	userSession: (userId: string) => `session:${userId}`,
	userPermissions: (organizationId: string, userId: string) =>
		`perms:${organizationId}:${userId}`,
	permissionCatalog: () => "platform:permission-catalog",
} as const;

/** Default TTLs per category (seconds). */
export const CacheTTL = {
	SHORT: 60,
	MEDIUM: 300,
	LONG: 3600,
	VERY_LONG: 86_400,
	SESSION: 1800,
} as const;
