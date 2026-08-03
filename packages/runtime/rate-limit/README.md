# `@afenda/rate-limit`

Canonical quota decision, key policy, bounded timing, and Upstash normalization capability.

## Consume

Consumers submit bucket-specific identity facts. The package constructs and normalizes storage keys internally.

```ts
import { rateLimit } from "@afenda/rate-limit";

const decision = await rateLimit.check({
  bucket: "auth_sign_in",
  identity: {
    kind: "credentials",
    ipAddress: "203.0.113.10",
    email: "user@example.test",
  },
});

if (!decision.ok) {
  const failure = rateLimit.project.failure(decision);
  const quota = rateLimit.project.quota(decision);
  // Return failure through @afenda/errors; pass quota to @afenda/http when present.
}
```

Decisions expose only `ok`. Quota state, retry timing, backend classification, and canonical failures are available only through `rateLimit.project`.

## Permanent surface

| Capability | Role |
|---|---|
| `rateLimit.check(input)` | Apply the bucket’s canonical quota and key policy |
| `rateLimit.project.failure(rejected)` | Produce `RATE_LIMITED` or `SERVICE_UNAVAILABLE` |
| `rateLimit.project.quota(decision)` | Produce validated quota facts for `http.headers.applyRateLimit` |
| `rateLimit.project.diagnostics(decision)` | Produce bounded operational classification |
| `@afenda/rate-limit/testing` | Construct opaque decisions in consumer tests |

`@afenda/http` remains the sole serializer of `X-RateLimit-*` headers. `@afenda/errors` remains the sole owner of status, public error body, retryability, and `Retry-After`.

## Canonical policies

| Bucket | Limit | Identity facts |
|---|---:|---|
| `auth_bff_post` | 20 / 60 seconds | client IP and pathname |
| `auth_sign_in` | 5 / 60 seconds | credentials IP/email or dev-login IP/role |
| `ai_chat` | 20 / 60 seconds | authenticated user ID |

Identity parts are trimmed, lowercased, length-bounded, and assigned canonical missing-value sentinels. Consumers never provide raw keys, limits, windows, prefixes, or retry timing.

## Runtime policy

| Runtime | Backend |
|---|---|
| Upstash credentials present | Shared Upstash sliding window |
| Non-production without credentials | Process-local memory |
| Production without credentials or failed store | Fail closed as `SERVICE_UNAVAILABLE` |

Upstash results are untrusted input. Remaining quota is clamped to the canonical limit, reset time is bounded to the authored window, malformed results fail closed, and retry seconds derive from the normalized reset.

## Verify

```bash
pnpm --filter @afenda/rate-limit lint
pnpm --filter @afenda/rate-limit typecheck
pnpm --filter @afenda/rate-limit test
pnpm check:rate-limit-boundary
pnpm test:rate-limit-boundary
pnpm --filter @afenda/auth typecheck
pnpm --filter @afenda/auth test
```

See [CONTRACT.md](./CONTRACT.md).