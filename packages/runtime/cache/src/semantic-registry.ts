import { cacheInvalid } from "./failure";
import type {
	CacheKey,
	CacheNamespace,
	CachePolicy,
	InternalCacheKey,
} from "./types";

const MAX_ID_LENGTH = 256;

/** Canonical namespace, TTL, and key/tag policy. Never root-export this registry. */
export const CACHE_POLICY_REGISTRY = Object.freeze({
	organization_config: Object.freeze({
		namespace: "organization_config",
		ttlSeconds: 3600,
	}),
	organization_features: Object.freeze({
		namespace: "organization_features",
		ttlSeconds: 300,
	}),
	permission_catalog: Object.freeze({
		namespace: "permission_catalog",
		ttlSeconds: 86_400,
	}),
	user_permissions: Object.freeze({
		namespace: "user_permissions",
		ttlSeconds: 300,
	}),
	user_session: Object.freeze({
		namespace: "user_session",
		ttlSeconds: 1800,
	}),
} satisfies Record<CacheNamespace, CachePolicy>);

function id(value: string, field: string): string {
	const normalized = value.trim();
	if (normalized.length === 0 || normalized.length > MAX_ID_LENGTH) {
		cacheInvalid(new TypeError(`Invalid cache ${field}`));
	}
	return encodeURIComponent(normalized);
}

function key(
	policy: CachePolicy,
	parts: readonly string[],
	tags: readonly string[],
): CacheKey {
	return Object.freeze({
		logicalKey: [policy.namespace, ...parts].join(":"),
		policy,
		tags: Object.freeze([...tags]),
	}) as unknown as CacheKey;
}

export const cacheKey = Object.freeze({
	organizationConfig(input: { organizationId: string }): CacheKey {
		const organizationId = id(input.organizationId, "organizationId");
		return key(
			CACHE_POLICY_REGISTRY.organization_config,
			[organizationId],
			[`organization:${organizationId}`],
		);
	},
	organizationFeatures(input: { organizationId: string }): CacheKey {
		const organizationId = id(input.organizationId, "organizationId");
		return key(
			CACHE_POLICY_REGISTRY.organization_features,
			[organizationId],
			[`organization:${organizationId}`],
		);
	},
	permissionCatalog(): CacheKey {
		return key(CACHE_POLICY_REGISTRY.permission_catalog, [], ["platform"]);
	},
	userPermissions(input: { organizationId: string; userId: string }): CacheKey {
		const organizationId = id(input.organizationId, "organizationId");
		const userId = id(input.userId, "userId");
		return key(
			CACHE_POLICY_REGISTRY.user_permissions,
			[organizationId, userId],
			[`organization:${organizationId}`, `user:${userId}`],
		);
	},
	userSession(input: { userId: string }): CacheKey {
		const userId = id(input.userId, "userId");
		return key(
			CACHE_POLICY_REGISTRY.user_session,
			[userId],
			[`user:${userId}`],
		);
	},
});

export function inspectCacheKey(value: CacheKey): InternalCacheKey {
	const candidate = value as unknown as Partial<InternalCacheKey>;
	if (
		typeof candidate.logicalKey !== "string" ||
		candidate.logicalKey.length === 0 ||
		!candidate.policy ||
		typeof candidate.policy.ttlSeconds !== "number" ||
		!Array.isArray(candidate.tags)
	) {
		throw new TypeError("Invalid cache key");
	}
	return candidate as InternalCacheKey;
}

export function organizationTag(organizationId: string): string {
	return `organization:${id(organizationId, "organizationId")}`;
}

export function userTag(userId: string): string {
	return `user:${id(userId, "userId")}`;
}
