const UNKNOWN_IDENTITY = "unknown";
const INVALID_IDENTITY = "_invalid";
const MAX_KEY_PART_LENGTH = 256;

export interface AuthBffPostRateLimitInput {
	bucket: "auth_bff_post";
	identity: Readonly<{
		ipAddress: string | undefined;
		pathname: string;
	}>;
}

export interface AuthSignInRateLimitInput {
	bucket: "auth_sign_in";
	identity:
		| Readonly<{
				email: string | undefined;
				ipAddress: string | undefined;
				kind: "credentials";
		  }>
		| Readonly<{
				ipAddress: string | undefined;
				kind: "dev-login";
				role: "client" | "operator";
		  }>;
}

export interface AiChatRateLimitInput {
	bucket: "ai_chat";
	identity: Readonly<{ userId: string }>;
}

export type RateLimitCheckInput =
	| AiChatRateLimitInput
	| AuthBffPostRateLimitInput
	| AuthSignInRateLimitInput;

export type RateLimitBucket = RateLimitCheckInput["bucket"];

export interface BucketPolicy {
	readonly limit: number;
	readonly windowMs: number;
}

function normalizedPart(value: string | undefined, fallback: string): string {
	const normalized = value?.trim().toLowerCase() ?? "";
	return normalized.length > 0
		? normalized.slice(0, MAX_KEY_PART_LENGTH)
		: fallback;
}

const ONE_MINUTE_MS = 60_000;

/** Canonical quota and key policy owner. Never export this registry at root. */
export const RATE_LIMIT_REGISTRY = Object.freeze({
	auth_bff_post: Object.freeze({
		limit: 20,
		windowMs: ONE_MINUTE_MS,
		key(input: AuthBffPostRateLimitInput): string {
			return `${normalizedPart(input.identity.ipAddress, UNKNOWN_IDENTITY)}:${normalizedPart(input.identity.pathname, INVALID_IDENTITY)}`;
		},
	}),
	auth_sign_in: Object.freeze({
		limit: 5,
		windowMs: ONE_MINUTE_MS,
		key(input: AuthSignInRateLimitInput): string {
			const ipAddress = normalizedPart(
				input.identity.ipAddress,
				UNKNOWN_IDENTITY,
			);
			return input.identity.kind === "credentials"
				? `${ipAddress}:credentials:${normalizedPart(input.identity.email, INVALID_IDENTITY)}`
				: `${ipAddress}:dev-login:${input.identity.role}`;
		},
	}),
	ai_chat: Object.freeze({
		limit: 20,
		windowMs: ONE_MINUTE_MS,
		key(input: AiChatRateLimitInput): string {
			return normalizedPart(input.identity.userId, INVALID_IDENTITY);
		},
	}),
} satisfies Record<RateLimitBucket, BucketPolicy & { readonly key: unknown }>);

export function policyFor(bucket: RateLimitBucket): BucketPolicy {
	return RATE_LIMIT_REGISTRY[bucket];
}

export function keyFor(input: RateLimitCheckInput): string {
	switch (input.bucket) {
		case "auth_bff_post":
			return RATE_LIMIT_REGISTRY.auth_bff_post.key(input);
		case "auth_sign_in":
			return RATE_LIMIT_REGISTRY.auth_sign_in.key(input);
		case "ai_chat":
			return RATE_LIMIT_REGISTRY.ai_chat.key(input);
		default: {
			const exhaustive: never = input;
			return exhaustive;
		}
	}
}
